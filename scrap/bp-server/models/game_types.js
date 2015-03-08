module.exports = (function() {

var _ = require('underscore')
  /*
var game_types = [
    // small blind  max stack
    //      min stack    max players
    //  SB    MIN    MAX    MAXP
      [   1,   40,   200,   10]
   // , [   1,   40,   100,    8]
   // , [   1,   40,   100,    4]
    , [   1,   40,   200,    10] //small min buyin. "shit show" stakes with freebies goign all in probably

    , [   3,  240,   600,    6]
    , [   3,  240,   600,    2]
    , [   10,  1200,  2000,  6]
    , [   10,  1200,  2000,  2]
    , [   25,  3000,  5000,  6]
    , [   25,  3000,  5000,  2]
    , [   50,  6000,  10000, 2]
    , [ 100,  8000,   20000, 6]
    , [ 500, 40000, 100000,  6]
    , [1000,  80000, 200000, 6]
    , [5000,  80000, 200000, 6]
    //this is where our "real money" players start (10,000 sat = 0.0001 BTC)
    , [10000,  160000, 200000, 6]   
    , [10000,  80000, 200000, 6]  
    , [10000,  80000, 200000, 6]  
    , [10000,  80000, 200000, 6]  
    , [10000,  80000, 200000, 6]  
    , [10000,  80000, 200000, 6]  
    , [ 1E4,  5E4,   1E6,    6]
    , [ 5E4, 25E4,   5E6,    6]
    , [25E4,  1E5,  25E6,    6]
    , [ 1E5,  5E5,   1E7,    6]
    , [ 5E5, 25E5,   5E7,    6]
    , [25E5,  1E6,  25E7,    6]
    , [ 1E6,  5E6,   1E8,    6]
    , [ 5E6, 25E6,   5E8,    6]
    , [25E6,100E6,  25E8,    2]

    ]// game_types

*/
//console.log('creating game types')


//create game type array to return

var make_game_type = function(sb, min, max, seats){
//  console.log('creating game type of sb: ' +sb + ' and max_seats: '+seats)
  return [sb, min, max, seats]
}
var game_types = [] 
//we are going to max out at about 2,000,000 satoshi buyin because the numbers will be too big to handle
var sb_max = 10000000
var min_buyin_in_sb = 40
var max_buyin_in_sb = 200
var limits_created = 0
var num_10_per_limit = 1
var num_6_per_limit = 1
var num_2_per_limit = 1
var current_sb = 1
var make_default_game_type = function(seats){
  return make_game_type(current_sb, current_sb*min_buyin_in_sb, current_sb*max_buyin_in_sb, seats)
}

while(current_sb <= sb_max){ //we will really check this condition inside though

//find our current_sb
if(limits_created>0){

if((limits_created-1)%2 === 0){current_sb = current_sb*3}
  else if((limits_created-1)%2 === 1){current_sb = (current_sb*10)/3}

}//if we have created at least 1 limit

if(current_sb > sb_max){break}

//make 10 max table
_.each(_.range(num_10_per_limit), function(element,index,list){
game_types.push(make_default_game_type(10))

})//make 10 max table

//make 6 max table
_.each(_.range(num_6_per_limit), function(element,index,list){

game_types.push(make_default_game_type(6))
})//make 6 max table

//make 2 max table
_.each(_.range(num_2_per_limit), function(element,index,list){
game_types.push(make_default_game_type(2))

})//make 2 max table


limits_created++
}//loop through and make our game_types

//console.log(game_types)

  return {
    // CONSTANT FOR ALL GAMES
    defaults: {
      // the number of players who need to be sitting/blinding before the hand can begin
      MIN_PLAYERS: 2
      // the minimum difference between two possible chip amounts at this table
    , MIN_INCREMENT: 1

      // how many ms to wait between polling to see how many players are ready
    , WAIT_POLL_INTERVAL: 5000
      // how long (in ms) between notifying about dealer change and posting small blind
    , DEALER_CHANGE_DELAY: 1000
      // how long (in ms) to wait - per player - after sending the hands_dealt message
    , PER_PLAYER_DEAL_DELAY: 150
      // how long (in ms) between posting blinds and next action (next blind or dealing)
    , POST_BLIND_DELAY: 300
      // how long (in ms) between last betting action and street_ends message
    , STREET_END_DELAY: 1000
      // how long (in ms) between street_ends message and next round, when bets have been collected
    , BET_COLLECTION_DELAY: 500
      // how long (in ms) between street_ends and community_dealt messages
    , PRE_DEAL_DELAY: 1000
      // how long (in ms) to wait before automatically skipping players who should be skipped
    , SKIP_PLAYER_DELAY : 1000
      // how long (in ms) to wait for players to respond to prompts
    , ACT_TIMEOUT: 16000
      // how long (in ms, per pot) to wait after winners message and before reset_table message
    , DISPLAY_HANDS_DURATION: 4000
      // how long (in ms) players can sit out before being forced from their seats
    , SIT_OUT_TIME_ALLOWED: 30000 // 30 seconds (for testing)
      // how long (in ms) players are forced to wait before buying with less than they stood up with
    , MIN_BUYIN_TIME_ENFORCED: 30000 // 30 seconds (for testing)
      // how often (in ms) to update the active player's time_to_act
    , TO_ACT_UPDATE_INTERVAL: 3000
      // how much longer to wait for a player's action than what we tell him/her
    , TO_ACT_GRACE_PERIOD: 1000
    }
  // which values are enumerated below for each game type
  , set_per_game: ['SMALL_BLIND', 'MIN_CHIPS', 'MAX_CHIPS', 'MAX_PLAYERS'] 
  // list of game types to be created for each currency
  // each entry lists the constants in set_per_game's order
  , game_types: game_types //declared above with loops

  // which values are enumerated below for each currency type
  , set_per_currency: ['CURRENCY', 'CURRENCY_ABBREV', 'CURRENCY_PER_CHIP']
  // list of currencies and their associated values
  // each entry lists the constants in set_per_currency's order
  , currency_types: [
    // currency   $/chip
      ['funbucks', 'FB', 1]
    , ['satoshi', 'sat', 1]
   // ,['bitcoins','btc',1]
    ]
  };
})();