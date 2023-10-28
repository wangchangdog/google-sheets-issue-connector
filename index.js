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
  const data = sheet.getRange("A2:G100").getValues(); // Adjust the range accordingly
  
  // Loop through each row in the sheet
  for (let i = 0; i < data.length; i++) {
    // A: ownerName
    // B: repoName
    // C: issueNumber
    // D: title
    // E, F, G: body
    const [ ownerName, repoName, issueNumber, title, body1, body2, body3] = data[i];
    // Create GitHub Issue
    if ( ownerName && repoName && title && body1 ) {
      const repoUrl = `https://github.com/${ownerName}/${repoName}.git`

      const body = `${body1}\n\n${body2 ?? ''}\n\n${body3 ?? ''}\n`
      const apiUrl = convertToApiUrl(repoUrl, issueNumber)

      const method = issueNumber ? 'patch' : 'post';
      Logger.log('Issue Number',issueNumber);
      Logger.log('Method',method);
      Logger.log('AuthToken', token);
      Logger.log('API URL', apiUrl);
      Logger.log('Title', title);
      Logger.log('Markdown Body', body);
      createIssue(method,token, apiUrl, title, body);
      // timeout
      Utilities.sleep(6000)
    }
  }
}

function createIssue(method, token, url, title, body) {
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
    })
  };

  // Send the request
  const response = UrlFetchApp.fetch(url, options);
  
  // Log the response for debugging
  Logger.log(response.getContentText());
}

// APIURLに変換
function convertToApiUrl(githubRepoUrl, issueNumber) {

  // GitHubリポジトリURLを解析
  const parts = githubRepoUrl.split('/');
  
  // ホスト名が 'github.com' であることを確認
  if (parts[2] !== 'github.com') {
    return 'Invalid GitHub URL';
  }
  
  // ユーザー名とリポジトリ名を取得
  const username = parts[3];
  // .gitを取り除く
  const repoName = parts[4].split('.')[0];
  
  // API用のURLを作成
  const apiUrl = `${GITHUB_API_BASE_URL}/${username}/${repoName}/issues/${issueNumber}`;
  Logger.log(apiUrl)
  
  return apiUrl;
}
