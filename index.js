const GITHUB_API_BASE_URL = 'https://api.github.com/repos';
const GITHUB_PERSONAL_ACCESS_TOKEN ='';
const GOOGLE_SHEETS_SHEET_NAME='Sheet1'

// Google Apps Script
function createGitHubIssues() {
  // GitHub Personal Access Token
  const token = GITHUB_PERSONAL_ACCESS_TOKEN

  // Fetch data from Google Sheet
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(GOOGLE_SHEETS_SHEET_NAME
  ) || ss.getSheetByName("シート1"); // Change to your sheet name
  
  // Fetch issue data
    const lastRow = sheet.getLastRow(); // Get the last row with data
  const data = sheet.getRange("A2:Z" + lastRow).getValues(); // Adjust the range to fetch data up to the last row
  // すべての行が空である配列を削除
  const filteredData = data.filter(row => row.join('').trim() !== '');
  
    // Fetch the headers
  const headers = sheet.getRange("1:1").getValues()[0]; // Assuming headers are in the first row
  // Convert array of arrays to array of objects, matching row values with labels
  
  const issues = filteredData.map(row => {
    return headers.reduce((obj, header, index) => {
      obj[header] = row[index];

      return obj;
    }, {});
  });
  issues.map((issue) => {
    const { ownerName, repoName, title, priority, duty, body1, body2, body3, issueNumber, status } = issue;
    // Skip if the issue.status is 'done' or 'pending'
    if (status === 'done' || status === 'pending') return;
    // Create GitHub Issue
    if (ownerName && repoName && title && body1) {
      const repoUrl = `https://github.com/${ownerName}/${repoName}.git`;
      // カンマまたはスペースまたは改行でラベルを分割する
      const labels = issue['labels'].split(/,|\s|\n/).map(label => label.trim()).filter(label => label !== '');
      console.log(labels);
      console.log(typeof labels);
      const generateTitle = (labels, duty, title, priority = '') => {
        if ( !labels && !duty ) return `${title}`
        if ( !labels ) return ` [${duty}] ${title}`
        if ( !duty ) return ` [${labels}] ${title}`
        if (labels.length > 1) return ` [${labels}] [${duty}] ${title}`
        return `[${duty}] ${title}`
      }
      const issueTitle = generateTitle( labels, duty, title, priority);
      const body = `# ${issueTitle}\n\n ${body1}\n\n${body2 ?? ''}\n\n${body3 ?? ''}\n`;
      const apiUrl = convertToApiUrl(repoUrl, issueNumber);
      console.log(apiUrl);
      const method = issueNumber ? 'patch' : 'post';
      Logger.log('Issue Number', issueNumber);
      Logger.log('Method', method);
      Logger.log('AuthToken', token);
      Logger.log('API URL', apiUrl);
      Logger.log('Title', title);
      Logger.log('Markdown Body', body);

      const res = createIssue({
        method,
        token,
        url: apiUrl,
        title: issueTitle,
        body,
        labels,
      });
      // issueNumberがない場合、新しいissueNumberを取得
      if (!issueNumber) {
        const response = JSON.parse(res.getContentText());
        console.log(response.number);
        Logger.log('Response', response);
        issue['issueNumber'] = response.number;
          // ここでシートに書き込む
          // 例えば、issueがfilteredDataの中の第i番目にあると仮定する
          const issueNumberIndex = headers.indexOf('issueNumber') + 1;
          const issueRowIndex = issues.indexOf(issue) + 2; // Adding 2 because the first row is the header
          sheet.getRange(issueRowIndex, issueNumberIndex).setValue(response.number);
      }
      // Wait for 6 seconds to avoid rate limiting
      Utilities.sleep(6000);
      return;
    }
  });

}

function createIssue({
  method, 
  token, 
  url, 
  title, 
  body,
  labels = '',
  assignees = '',
}) {
  console.log({
    method, 
    token, 
    url, 
    title, 
    body,
    labels,
    assignees,
  });
  const options = {
    "method": method,
    "headers": {
      "Authorization": `token ${token}`,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "Google-Apps-Script"
    },
    "payload": JSON.stringify({
      "title": title, 
      "body": body,
      "labels": labels,
      "assignees": assignees.split(',').map(assignee => assignee.trim()),
    })
  };
  console.log(options)
  console.log(url)
  // Send the request
  const response = UrlFetchApp.fetch(url, options);
  
  // Log the response for debugging
  Logger.log(response.getContentText());

  return response;
}

// APIURLに変換
function convertToApiUrl(githubRepoUrl, issueNumber) {

  // GitHubリポジトリURLを解析
  const parts = githubRepoUrl.split('/');
  
  // ホスト名が 'github.com' であることを確認
  if (parts[2] !== 'github.com') {
    throw new Error('Invalid GitHub URL');
  }
  
  // ユーザー名とリポジトリ名を取得
  const username = parts[3];
  // .gitを取り除く
  const repoName = parts[4].split('.')[0];
  
  // API用のURLを作成
  const apiUrl = `${GITHUB_API_BASE_URL}/${username}/${repoName}/issues` + (issueNumber ? `/${issueNumber}` : '');
  Logger.log(apiUrl)
  
  return apiUrl;
}
