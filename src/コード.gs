// Webアプリにアクセスした際に実行される関数
function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('FAQチャットボット')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ユーザーが質問を送信した際に実行される関数
function doPost(e) {
  var question = null; // Initialize question
  var answer = "申し訳ありませんが、予期せぬエラーが発生しました。"; // Default error message

  try {
    // Ensure 'e' and 'e.question' exist
    if (e && typeof e.question !== 'undefined') {
      question = e.question;
      Logger.log('Received question: ' + question);

      if (question.trim() === '') {
         Logger.log('Received an empty question.');
         answer = "質問が空のようです。";
      } else {
        // Call searchFAQ only if question is valid
        answer = searchFAQ(question);
        Logger.log('Answer from searchFAQ: ' + answer);
      }
    } else {
      Logger.log('Error: Invalid request object received. "question" property missing or invalid.');
      answer = "エラー：無効なリクエストを受け取りました。";
    }

  } catch (error) {
    // Catch any unexpected errors during the process
    Logger.log('Critical Error in doPost: ' + error + '\nStack: ' + error.stack);
    // Keep the default error message or set a specific one
    answer = "サーバー内部でエラーが発生しました。管理者に連絡してください。";
  }

  // Always return a JSON response
  try {
    var jsonResponse = JSON.stringify({ 'answer': answer });
    Logger.log('Returning JSON: ' + jsonResponse);
    return ContentService.createTextOutput(jsonResponse)
      .setMimeType(ContentService.MimeType.JSON);
  } catch (jsonError) {
    // Handle potential errors during JSON stringification (e.g., circular references)
    Logger.log('Error stringifying the response: ' + jsonError);
    // Return a fallback error message as plain text or simple JSON
    return ContentService.createTextOutput(JSON.stringify({ 'answer': 'エラー：応答を生成できませんでした。' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


// FAQデータベースから回答を検索する関数
function searchFAQ(question) {
  // スプレッドシートのID
  var spreadsheetId = "YOUR_SPREADSHEET_ID"; // スプレッドシートIDをここに入力

  // スプレッドシートを取得
  var spreadsheet = SpreadsheetApp.openById(spreadsheetId);

  // FAQDataシートを取得
  var faqDataSheet = spreadsheet.getSheetByName("FAQData");

  // FAQDataシートのデータを取得
  var faqData = faqDataSheet.getDataRange().getValues();

  // 質問文とキーワードを格納する配列
  var questions = [];
  var keywords = [];

  // FAQデータをループして質問文とキーワードを取得
  for (var i = 1; i < faqData.length; i++) { // 1行目はヘッダーなのでスキップ
    questions.push(faqData[i][1]); // 質問文
    keywords.push(faqData[i][3]); // キーワード
  }

  // スコアが最も高い回答を選定
  var bestMatchIndex = findBestMatch(question, questions, keywords);

  // 回答がない場合
  if (bestMatchIndex == -1) {
    return "回答が見つかりませんでした。";
  }

  // 回答を取得
  var answer = faqData[bestMatchIndex + 1][2]; // 1行目はヘッダーなので+1

  return answer;
}

// 質問文とキーワードを使用してスコアが最も高い回答を選定する関数
function findBestMatch(question, questions, keywords) {
  var bestMatchIndex = -1;
  var bestMatchScore = 0;

  // 質問文とキーワードをループしてスコアを計算
  for (var i = 0; i < questions.length; i++) {
    var score = calculateScore(question, questions[i], keywords[i]);

    // スコアが最も高い場合
    if (score > bestMatchScore) {
      bestMatchScore = score;
      bestMatchIndex = i;
    }
  }

  return bestMatchIndex;
}

// 質問文とキーワードを使用してスコアを計算する関数
function calculateScore(question, questionText, keywords) {
  var score = 0;

  // 質問文にキーワードが含まれている場合、スコアを加算
  if (keywords != null && keywords != "") {
    var keywordArray = keywords.split(",");
    for (var i = 0; i < keywordArray.length; i++) {
      if (question.indexOf(keywordArray[i].trim()) != -1) {
        score++;
      }
    }
  }

  // 質問文と質問テキストが一致する場合、スコアを大幅に加算
  if (question == questionText) {
    score += 10;
  }

  return score;
}