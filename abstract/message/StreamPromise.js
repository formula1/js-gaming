/**
  @constructor
  @param {function} sendFn - Function that will be called when you wish to write something to a target.
*/
function StreamPromise(sendFn){
  if(sendFn) this.sendFn = sendFn;
  this._fails = [];
  this._dones = [];
}

StreamPromise.prototype.inherit = function(sendFn){
  this.sendFn = sendFn;
  return this;
};

StreamPromise.prototype._write = function(err,data){
  var i;
  if(err){
    if(fails.length === 0) throw err;
    for(i=0;i<this._fails.length;i++)
      this._fails[i](err);
    return;
  }
  for(i=0;i<this._dones.length;i++)
    this._dones[i](data);
};

StreamPromise.prototype.fail = function(fn){
  this._fails.push(fn);
  return this;
};

StreamPromise.prototype.done = function(fn){
  this._dones.push(fn);
  return this;
};

StreamPromise.prototype.send = function(data){
  if(!this.sendFn) throw Error("cannot send without a send Function");
  console.log(this.sendFn);
  this.sendFn(data);
  return this;
};
