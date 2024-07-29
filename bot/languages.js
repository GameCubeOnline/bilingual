const translate = require('@iamtraction/google-translate');
const settings = require("./settings.js");

const PATTERN_THAI = /[ก-๙]/ig;
const PATTERN_ENGLISH = /[a-z]/ig;
const PATTERN_SYMBOLS = /[\s0-9\.\!\@\#\$\%\^\&\*\(\)\<\>]/ig;

function guessLanguage(text){
  let stripText = text.replace(PATTERN_SYMBOLS, '');
  if(stripText.length <= 0){
    return null;
  }
  let thai = stripText.replace(PATTERN_THAI, '');
        
  let fullLength = stripText.length;
  let halfLength = fullLength / 2;
  let thaiLength = thai.length;
  if(thaiLength <= halfLength){
    return "th";
  }
  return null;
}

const UNENCAPSULATE_RULE = /\<\s*blnglemj\s+id\s*=\s*\"([^\"]+)\"\s*\>/ig;

const ENCAPSULATE_RULES = [
  /(\:[a-z0-9]+\:)/ig,
  /([¯\\\/_\+\-\*\&\!\@\#\$\%\^\{\}\'\"\:\?\~\(\)ツ╯°゜□︵━┻┬─ノ][\s¯\\\/_\+\-\*\&\!\@\#\$\%\^\{\}\'\"\:\?\~\(\)ツ╯°゜□︵━┻┬─ノ]{5,})/ig,
];

function encapsulate(text){
  var result = text;
  var variables = {};
  var variableId = 0;
  
  function getReplacement(match){
    variableId += 1;
    variables[variableId] = match;
    return `<blnglemj id="${variableId}">`;
  }
  
  ENCAPSULATE_RULES.forEach(function(pattern){
    result = result.replace(pattern, getReplacement);
  });
  
  return {
    variables: variables,
    text: result,
  }
}

function unencapsulate(data){
  var result = data.text;
  var variables = data.variables;
  function getReplacement(match, variableId) {
    return variables[parseInt(variableId, 10)];
  }
  result = result.replace(UNENCAPSULATE_RULE, getReplacement);
  // result = result.replace(UNENCAPSULATE_RULE, getReplacement);
  return result;
}

// {
//  "text":"<@963286489276485692> Come in and help.",
//  "from":{
//     "language":{"didYouMean":false,"iso":"th"},
//     "text":{"autoCorrected":false,"value":"","didYouMean":false}
//   },
//   "raw":""
//  }
async function getTranslation(content, options){  
  let op = options || {};
  let toLanguage = op.to;
  let fromLanguage = op.from;
  if(!fromLanguage) {
    fromLanguage = guessLanguage(content);
  }
  if(toLanguage == fromLanguage){
    return {
      "text": content,
      "from": fromLanguage,
    }
  } 
  if(!content) {
    return {
      "text": content,
      "from": settings.DEFAULT_LANGUAGE,
    }
  }
  
  var data = encapsulate(content);
  let translated = await translate(data.text, {to: toLanguage});
  data.text = translated.text;

  let result = unencapsulate(data);
  // console.log(` -> ${result}`);
  return {
    "text": result,
    "from": translated.from.language.iso, 
  }
}


class LazyText{
  
  constructor(content) {
    this.content = content;
    this.translated = null;
  }
  
  async resolve(options){
    this.translated = await getTranslation(this.content, options);
  }
  
  toString(){
    if(this.translated) {
      return this.translated.text;
    }
    return this.content;
  }
  
  toJSON(){
    return this.toString();
  }
}

class LazyTextStore {
  
  constructor(options) {
    this.options = options;
    this.unresolvedItems = [];
    this.itemsByContent = {};
  }
  
  get(content){
    let result = this.itemsByContent[content];
    if(!result){
      result = new LazyText(content);
      this.itemsByContent[content] = result;
      this.unresolvedItems.push(result);
    }
    return result;
  }
  
  async resolve(options){
    var op = options || this.options;
    let items = this.unresolvedItems;
    this.unresolvedItems = [];    
    await Promise.all(items.map(function(item){
      return item.resolve(op);
    }));
  }
  
  async compile(data){
    await this.resolve();
    
    /// such a quick hack!
    return JSON.parse(JSON.stringify(data));
  }
    
}
module.exports = {
  getTranslation,
  LazyText,
  LazyTextStore,
}
