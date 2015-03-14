


function validateAttributes(attributes){


}

function applyDefaults(collection,defaults){

  for(var i in defaults){
    if(!collection[i]) collection[i] = defaults[i] ;
  }
  for(var flag in flags) {
    collection[flag] = flags[flag];
  }

}
