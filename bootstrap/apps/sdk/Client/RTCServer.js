
var async = require("async");

module.exports = function(match){
  var bestHost = {host:null, avg_ntp:Math.POSITIVE_INFINITY};
  var l = match.players.length;
  async.each(match.players,function(player){
    player.add("ice",function(message,next){
      console.log("ice");
      if(!match.players[message.target.id]){
        return next("cannot ice to a nonexistant user");
      }
      if(message.target.id == player.id){
        return next("cannot ice to self: "+message.identity+", "+user.id);
      }
      match.players[message.target.id].trigger("ice",message);
    });
    var others = players.slice(0);
    others.splice(testers.indexOf(possible_host),1);
    player.others = others;
    others = others.map(function(other){
      return other.user;
    });
    player.get("register-others",others,next);
  },function(err,res){
    //$-Foreach User as POSSIBLE_HOST
    async.eachSeries(match.players,function(possible_host,next){
      //$-Request RTC offers from POSSIBLE_HOST for each other Player
      possible_host.get("request-offers",function(err,offers){
        async.each(possible_host.others,function(tester,next){
          //$-Request an RTC accept from TESTER by sending TESTER a unique RTC offer
          tester.get("request-accept",offers[tester.id],function(err,accept){
            //$-Server sends accept to POSSIBLE_HOST
            possible_host.get("request-handshake",accept,next);
          });
        },function(err){
          if(err) return next(err);
          //$-After All connections are ready
          //$-Server Sends Test command to Every User
          match.syncGet("request-ntp",function(err,ntps){
            //$-Server calculates the net_ntp=ntp.map(^2).sum(ntp^2)/ntp.length
            //server makes sure that ntp's are close to eachother
            host_ntps = ntps[possible_host.id];
            delete ntps[possible_host.id];
            var net_ntp;
            for(var i in host_ntps){
              if(Math.abs(ntps[i][0].lag - host_ntps[i].lag) > 20){
                console.log("something is off");
              }
              //Calculate the ntp
              // avg_ntp = (person_a->possible_host + possible_host->person_a)/2
              // weighted_ntp = Math.pow(avg_ntp,2) this is important since big
              // brings everyone down
              // net_ntp += weighted/(players.length-1) I could also just find max
              net_ntp += Math.pow(
                  (ntps[i][0].lag + host_ntps[i].lag)/2,
                  2
                )/(match.player.length-1);
            }
            //$-Check if its the best host yet
            bestHost = bestHost.ntp < net_ntp?
              bestHost:
              {host:possible_host, ntp:net_ntp};
            // $-Server orders all users to disconnect
            match.syncGet("request-closeAll",next);
          });
        });
      });
    },function(err,results){
      //$-Request RTC offers from BEST_HOST.host = Number of players - 1
      bestHost.host.get("real-offers",function(err,offers){
        if(err) return next(err);
        async.each(bestHost.host.others,function(other,next){
          //$-Request an RTC accept from all other players
          other.get("real-accept",offers[other.id],function(err,accept){
            if(err) return next(err);
            //$-Server sends RTC accept to POSSIBLE_HOST
            possible_host.get("real-handshake",accept,next);
          });
        },function(err){
          if(err) return next(err);
          //$-Server Tells All players BEST_HOST is the host
          match.players.syncCast("host",bestHost.host.user);
        });
      });
    });
  });
};
