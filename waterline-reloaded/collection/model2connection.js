



function normalizeIdentity(properties){
  if(properties.tableName && !properties.identity) {
    properties.identity = properties.tableName.toLowerCase();
  }

  // Require an identity so the object key can be set
  if(!properties.identity) {
    throw new Error('A Collection must include an identity or tableName attribute');
  }
}
