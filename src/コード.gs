/**
 * FAQ自動応答チャットボットシステム
 * Google Apps Script バックエンドコード
 */

// Webアプリとして公開したときの初期表示処理
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('FAQ チャットボット')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// HTML内で読み込む CSS ファイルを取得
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// POST リクエストを処理する関数
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const question = data.question;
    
    // 質問に対する回答を検索
    const answer = searchFAQ(question);
    
    // 結果を返す
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      answer: answer
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * FAQデータベースから質問に最適な回答を検索する関数
 * @param {string} question - ユーザーからの質問
 * @return {string} 最適な回答、または見つからない場合はデフォルトメッセージ
 */
function searchFAQ(question) {
  // スプレッドシートを取得
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('FAQData');
  
  if (!sheet) {
    return 'FAQデータが見つかりません。管理者にお問い合わせください。';
  }
  
  // データ範囲を取得（ヘッダー行を除く）
  const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5);
  const faqData = dataRange.getValues();
  
  if (faqData.length === 0) {
    return 'FAQデータが登録されていません。管理者にお問い合わせください。';
  }
  
  // 質問文からキーワードを抽出（簡易版）
  const keywords = extractKeywords(question);
  
  // 各FAQエントリに対してマッチングスコアを計算
  let bestMatch = null;
  let highestScore = 0;
  
  for (const row of faqData) {
    const id = row[0];
    const faqQuestion = row[1];
    const faqAnswer = row[2];
    const faqKeywords = row[3].split(',').map(kw => kw.trim().toLowerCase());
    const category = row[4];
    
    // マッチングスコアの計算
    let score = calculateMatchingScore(question, faqQuestion, faqKeywords, keywords);
    
    // 最高スコアを更新
    if (score > highestScore) {
      highestScore = score;
      bestMatch = faqAnswer;
    }
  }
  
  // スコアのしきい値を設定（0.3は調整可）
  const threshold = 0.3;
  
  if (highestScore >= threshold && bestMatch) {
    return bestMatch;
  } else {
    return 'すみません、その質問に対する回答が見つかりませんでした。別の言葉で質問していただくか、お問い合わせフォームからご連絡ください。';
  }
}

/**
 * 質問文からキーワードを抽出する関数（簡易版）
 * @param {string} text - 処理する文字列
 * @return {Array} 抽出されたキーワードの配列
 */
function extractKeywords(text) {
  // 不要な文字を削除
  const cleanText = text.toLowerCase()
    .replace(/[、。？！,.?!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // ストップワード（除外する一般的な言葉）
  const stopWords = ['は', 'を', 'に', 'の', 'が', 'で', 'た', 'と', 'です', 'ます', 'ください', 'お願い', 'したい', 'どう', 'どの', 'どこ', 'いつ', 'なぜ', 'なに', 'だれ'];
  
  // 単語に分割（簡易的な方法）
  const words = cleanText.split(' ');
  
  // ストップワードを除外
  return words.filter(word => {
    return word.length > 1 && !stopWords.includes(word);
  });
}

/**
 * 質問とFAQエントリのマッチングスコアを計算する関数
 * @param {string} userQuestion - ユーザーの質問
 * @param {string} faqQuestion - FAQの質問文
 * @param {Array} faqKeywords - FAQのキーワード配列
 * @param {Array} userKeywords - ユーザー質問から抽出したキーワード配列
 * @return {number} マッチングスコア（0～1）
 */
function calculateMatchingScore(userQuestion, faqQuestion, faqKeywords, userKeywords) {
  let score = 0;
  
  // 1. キーワードマッチングによるスコア（最大0.6）
  let keywordMatches = 0;
  
  for (const userKeyword of userKeywords) {
    // FAQキーワードリストとのマッチング
    if (faqKeywords.some(keyword => keyword.includes(userKeyword) || userKeyword.includes(keyword))) {
      keywordMatches++;
    }
    
    // FAQ質問文とのマッチング
    if (faqQuestion.toLowerCase().includes(userKeyword)) {
      keywordMatches += 0.5; // 半分のウェイト
    }
  }
  
  if (userKeywords.length > 0) {
    score += 0.6 * (keywordMatches / (userKeywords.length + faqKeywords.length / 2));
  }
  
  // 2. 文字列類似度によるスコア（最大0.4）
  const similarityScore = calculateStringSimilarity(userQuestion.toLowerCase(), faqQuestion.toLowerCase());
  score += 0.4 * similarityScore;
  
  return score;
}

/**
 * 2つの文字列の類似度を計算する関数（簡易版）
 * @param {string} str1 - 比較する文字列1
 * @param {string} str2 - 比較する文字列2
 * @return {number} 類似度（0～1）
 */
function calculateStringSimilarity(str1, str2) {
  // 共通する2文字のシーケンスをカウント
  let matches = 0;
  
  // 短い方の文字列から抽出できる2文字シーケンスの数
  const shortString = str1.length < str2.length ? str1 : str2;
  const possibleMatches = Math.max(shortString.length - 1, 1);
  
  for (let i = 0; i < str1.length - 1; i++) {
    const bigram1 = str1.substring(i, i + 2);
    
    for (let j = 0; j < str2.length - 1; j++) {
      const bigram2 = str2.substring(j, j + 2);
      
      if (bigram1 === bigram2) {
        matches++;
        break;  // 一致するものが見つかったらこのビグラムについてはループ終了
      }
    }
  }
  
  // 類似度スコアを計算（0～1の間）
  return matches / possibleMatches;
}

/**
 * HTMLフォームからの質問を処理する関数（クライアントサイドJSから呼び出される）
 * @param {string} question - ユーザーの質問
 * @return {string} チャットボットの回答
 */
function processQuestion(question) {
  try {
    // 質問に対する回答を検索
    const answer = searchFAQ(question);
    return answer;
  } catch (error) {
    console.error('Error processing question:', error);
    return 'エラーが発生しました。しばらく経ってからもう一度お試しください。';
  }
}