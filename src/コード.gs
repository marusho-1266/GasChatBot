// Webアプリにアクセスした際に実行される関数
function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('FAQチャットボット')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ユーザーが質問を送信した際に実行される関数
function doPost(e) {
  // ユーザーからの質問を取得
  var question = e.parameter.question;

  // FAQデータベースから回答を検索
  var answer = searchFAQ(question);

  // 回答をJSON形式で返す
  return ContentService.createTextOutput(JSON.stringify({ "answer": answer }))
      .setMimeType(ContentService.MimeType.JSON);
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