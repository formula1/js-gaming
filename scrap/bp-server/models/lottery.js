module.exports = (function () {
var moment = require('moment')
var _ = require('underscore')
var mongoose = require('mongoose')
var db = require('./db')
var User = require ('./user')

var HOURS_PER_LOTTERY = 12
var SATOSHI_PER_ENTRY = 500
var MAX_SATOSHI_PER_LOTTERY = 50000


var LOTTERY_INTERVAL = HOURS_PER_LOTTERY*60*60*1000 
var INTERVAL_MARGIN_OF_ERROR = 1000 //implement later


var LotterySchema = new mongoose.Schema({

    start              : { type: Date, default: function(){return new Date()} }
    ,end               : { type: Date, default: function(){return moment(new Date()).add('ms', LOTTERY_INTERVAL).toDate()}}
    ,entries           : {type:mongoose.Schema.Types.Mixed, default: function(){return{}} }
    ,winning_username  : {type: String}
    ,payout_formula    : {type:mongoose.Schema.Types.Mixed, default:function(){ return function(thisLottery){return _.size(thisLottery.entries)*SATOSHI_PER_ENTRY} }}
    ,currency          : {type:String, default:'satoshi'}
    ,paid              : {type:Boolean, default:false}
  }, { minimize: false }); // set minimize to false to save empty objects



  LotterySchema.methods.addEntry = function(userInfo, cb) {
var lottery = this
console.log('lottery.addentry called for username '+userInfo.username)

if(!lottery.running){cb('lottery not running');return}

if(lottery.entries[userInfo.username]){return cb('entry already exists')}
else{ 
  console.log('user has not entered yet')
  lottery.entries[userInfo.username] = {
address:userInfo.address
,email:userInfo.email
  }
 // console.log(lottery.entries)
 // lottery.markModified('entries')
  lottery.markModified('entries.'+userInfo.username)
  lottery.save(function(err, lottery){
if(err){return console.error(err)}
else if(lottery){
  //console.log(userInfo.username + ' entered into the lottery')
  console.log(lottery)
  cb(null, lottery)
}
   })//save

}//end of searching through to find if already have an entry

  }//add entry

    LotterySchema.virtual('decided').get(function(){
     // console.log('getting virtual property decided')
     // console.log(this)
      var now = moment()
if(_.isString(this.winning_username ) && this.winning_username != ''){
console.log('lottery decided by virtue of winning_username: ' + this.winning_username)
  return true
}
  //if over and no entries
  else if(_.isEmpty(this.entries) && (moment(this.end).isBefore(now) || moment(this.end).isSame(now))){
//console.log('lottery decided by virtue of is empty:' + _.isEmpty(this.entries))
//console.log(this.entries)
    return true}
  else{return false}

    })

     LotterySchema.virtual('payout').get(function(){

var payout = 0


if(_.isFunction(this.payout_formula)){payout = this.payout_formula(this)}

  else if(_.isNumber(this.payout_formula)){payout = this.payout_formula}

if(payout>MAX_SATOSHI_PER_LOTTERY) payout = MAX_SATOSHI_PER_LOTTERY;
 
 return payout

    })



    LotterySchema.virtual('running').get(function(){

if(moment(this.start).isBefore() && moment(this.end).isAfter()){return true}
  else{return false}

    })


LotterySchema.virtual('remaining').get(function(){

var remaining = moment(this.end).diff(moment())
return remaining

})



  LotterySchema.methods.pickWinner = function(cb) {
    var lottery = this

console.log('pickwinner called on ' + this['_id'] + ', running = '  +lottery.running)
//console.log(this)

    if(lottery.running){return cb(null, null)} 
    else if(lottery.decided){
//console.log('lottery already decided')
//console.log(lottery.entries)
      return cb(null, null)}

//console.log('determing winner ...')

var entryArray = Object.keys(lottery.entries)
var numEntries = entryArray.length
var winningIndex = Math.floor(Math.random(numEntries))

//console.log(entryArray)
//console.log(winningIndex)
var winning_username = entryArray[winningIndex]

lottery.winning_username = winning_username

lottery.save(function(err, lottery){
if(err){return console.error(err)}

try{
console.log(winning_username + 'has won ' + lottery.payout +' ' + lottery.currency+ '  in the lottery of '+numEntries +' entries!')
console.log(lottery.entries)
cb(null, winning_username) //this will start the next lottery
}catch(err){console.warn('error determining winning amount in lottery')}

//pay winner of this lottery
lottery.payWinner(function(err, new_balance){

if(err){console.warn('failed to payout the player');return console.error(err)}
else{console.log(winning_username + 'has won ' + lottery.payout +' ' + lottery.currency+ '  in the lottery of '+numEntries +' entries with a new balance of ' + new_balance +'!')
lottery.paid = true
lottery.save(function(err, lottery){if(err)return console.error(err);})
}

})//payout the winner


})


  }//finish the lottery

  LotterySchema.methods.setTimeout = function(cb) {
var id = this['_id']

//console.log('setting 1 timeout')
var timer = setTimeout(function(){
  //first get current lottery
Lottery.findById(id, function (err, lottery) {
  if(err){return console.error(err)}
else if(!lottery){return console.warn('no lottery found with id = ' +id)}
  //console.log('findById successfully')
  lottery.pickWinner(cb || function(err, winnerInfo){
    if(err){return console.error('error')}
      else {
        Lottery.create(function(err, res){
    if(err){return console.warn(err)}
      })
    }
  });
});

}, this.remaining + INTERVAL_MARGIN_OF_ERROR)

return timer

  }//finish the lottery


 LotterySchema.statics.setTimeouts = function(cb) {

  this.find()
  .where('paid').equals(false)
  .where('running').equals(true)
  .where('decided').equals(false)
  .exec (function(err, lotteries){
_.each(lotteries, function(lottery, index, lotteryArray){

lottery.setTimeout()

})


  } )

 }//activates timeouts on all uncompleted lotteries

  LotterySchema.statics.current = function(cb) {
//console.log('lottery.current called')
this.findOne({end: { $gt : new Date() }}, function(err, lottery){
//console.log(lottery)
if(err){return console.error(error)}
  else{
   // console.log('lottery.current returning a', lottery)
    return cb(err, lottery)
  }

})


  }//get the currenttly OPEN lottery


//runs cb(err, new_balance)
LotterySchema.methods.payWinner = function(cb){

var lottery = this
var payout = lottery.payout

User.findOne({username:this.winning_username}, function(err, user){
if(err){console.log('winner not found');return console.error(err)}
console.log(user)

var transaction = {
  type: 'lottery id: ' + lottery['_id']
  ,amount: payout
  ,timestamp: new Date()
}

user.updateBalance(lottery.currency, payout , transaction ,cb )
  

})//find the user by username

}//pay the winner



  LotterySchema.statics.create = function(cb) {

if(!_.isFunction(cb)){var cb = function(){}}

this.current(function(err, currentLottery){

if(currentLottery){return cb('tried to create lottery when there is already a lottery in progress', currentLottery)}
else {var currentLottery = new Lottery()}
currentLottery.save(function(err, lottery){

if(err){return cb(err)}
else{
  //console.log('lottery successfully created:', lottery);
  lottery.setTimeout()
cb(err, lottery)
}

})

})



  }//create a new lottery


var Lottery = mongoose.model('Lottery', LotterySchema);

// start up lottery
Lottery.create();
Lottery.setTimeouts();

return Lottery;

})();
