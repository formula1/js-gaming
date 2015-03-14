



function normalizeIdentity(properties){
  if(properties.tableName && !properties.identity) {
    properties.identity = properties.tableName.toLowerCase();
  }

}

if(!options.tableName && !options.identity) {
  throw new Error('A tableName or identity property must be set.');
}
options.identity = options.identity.toLowerCase();


function applyDefaults(collection,defaults){
  if(collection.tableName && !collection.identity) {
    collection.identity = collection.tableName;
  }
  collection.identity = collection.identity.toLowerCase();
  for(var i in defaults){
    if(!collection[i]) collection[i] = defaults[i] ;
  }
}

function validateCollection(collection,waterline){
  if(!collection.identity) {
    throw new Error('A Collection must include an identity or tableName attribute');
  }
  if(!waterline.connections[collection.connection[0]]){
    throw new Error('No adapter was specified for collection: ' + options.identity);
  }
}
