function TRANSLATIONS(){

var numEntries = 0
var addEntry = function(language, text){

this[language][text.toLowerCase()] = numEntries
this[language].id = text

}


var incrementID = function(){numEntries ++}

var Language = function(languageAbbreviation){
	this = {}
}

//DIFF LANGUAGES
this.en = new Language() //english
this.chs = new Language() //chinese simplified (mainland china)
this.sp = new Language() //espanol
this.fr = new Language() //french


this.translatedText = function (text, translationOptions){
	if(!translationOptions){var options = {}}
		else{var options = _.clone(translationOptions)}
if(!_.isString(options.from)){options.from = 'en'}

	if(!_.isString(options.to)){this = text;return} //return given text if to not specified

var id = this[options.from][text.toLowerCase()]
var translation = this[options.to].id



this = translation

}

this.addTranslation = function(a, b){

/*transform input into an object like this 
{
languageName: text
,languageName:text


}
*/

if(_.isArray(a) && _.isArray(b)){

	var languages = a
	var text = b

var translations = {}

_.each(languages, function(value, element, list){

translations[value] = text[element]

})


}

else if(_.isObject(a)){

var translations = a

}

if(!_.isObject(translations) || _.isEmpty(translations)){return}

var DICTIONARY = this
var id = DICTIONARY.total

_.each(translations, function(value, key, list){

var key = languageAbbreviation
var value = translation

if(DICTIONARY[languageAbbreviation] instanceof Language !== true){DICTIONARY[languageAbbreviation] = new Language()}

	if(_.isNumber(DICTIONARY[languageAbbreviation][translation.toLowerCase()])){throw 'error duplicate string'}
		if(_.isString(DICTIONARY[languageAbbreviation][id])){throw 'error duplicate id'}

addEntry(languageAbbreviation, translation)
})

incrementID() //increment total

}


}//DICTIONARY constructor


TRANSLATIONS = new TRANSLATIONS()

var translationArray = []

translationArray.push({
en: 'English'
,chs: '英文'
,sp: 'Ingles'

})

translationArray.push({
en: 'Chinese'
,chs: '中文'
,sp: 'Chino'

})

translationArray.push({
en:'bitcoin'
,chs:'比特币'
})

translationArray.push({
en:'poker'
,chs:'扑克'
})

translationArray.push({
en:'logout'
,chs:'退出'
})

translationArray.push({
en:'log out'
,chs:'退出'
})

translationArray.push({
en:'login'
,chs:'登录'
})

translationArray.push({
en:'register'
,chs:'注册'
})

translationArray.push({
en:'register'
,chs:'注册'
})



//this will add translations into the dictionary

_.each(translationArray, function(value, element, list){


TRANSLATIONS.addTranslation(value)


})