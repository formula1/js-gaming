var Waterline = require('waterline');
var stdSchema = require(__root+"/bootstrap/database/abstract/waterline");
var async = require("async");
/*
Pawns are dumb without a queen
A Queen is unapproachable without her pawns
*/

var QueenCollection = Waterline.Collection.extend(stdSchema({
  // Define a custom table name
  tableName: 'Queen',
  identity: 'queen',
  schema: true,
  connection: "database",
  attributes: {
    name:{
      type:"string",
      unique:true,
      required:true
    }
  }
}));

var PawnCollection = Waterline.Collection.extend(stdSchema({
  // Define a custom table name
  tableName: 'pawn',
  identity: 'pawn',
  schema: true,
  connection: "database",
  attributes: {
    queen:{
      model: 'queen',
      index:true,
      required:true
    },
    pawnType: {
      type:"string",
      defaultsTo:"default"
    },
    name:{
      type:"string",
      defaultsTo:function(){
        return this.dependentType+"_anonymous_"+Date.now();
      },
      required:true
    }
  }
}));


module.exports = function(waterline){
  waterline.loadCollection(QueenCollection);
  waterline.loadCollection(PawnCollection);
  waterline.on("initialize",function(){
    var Pawn = waterline.collections.pawn;
    var Queen = waterline.collections.queen;
    Pawn.before("validate",function(values,next){
      if(values.queen) return next();
      console.log("before?");
      Queen.find({name:values.name}, function(err,queens){
        if(err) return next(err);
        if(queens.length > 0){
          values.queen = queens[0].id;
          return next();
        }
        Queen.create({name:values.name},function(err,queen){
          if(err) return next(err);
          values.queen = queen.id;
          next();
        });
      });
    });
    Pawn.after("destroy",function(values,next){
      console.log("MAIN destroying pawn");
      console.log(values);
      if(Array.isArray(values)){
        if(values.length === 0) return next();
      }else{
        values = [values];
      }
      var ad = [];
      async.each(values,function(values,next){
        if(ad.indexOf(values.queen) !== -1) return next();
        Pawn.find({queen:values.queen}, function(err,pawns){
          if(err) return next(err);
          if(pawns.length > 0) return next();
          Queen.destroy({id:values.queen},next);
        });
      },next);
    });
    Queen.after('destroy', function(values,next){
      console.log("MAIN destroying queen");
      console.log(values);
      if(Array.isArray(values)){
        if(values.length === 0) return next();
      }else{
        values = [values];
      }
      async.each(values,function(values,next){
        Pawn.destroy({queen:values.id},next);
      },next);
    });
  });
};
