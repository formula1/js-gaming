

function Collection(options,waterline){
    // Throw Error if no Tablename/Identity is set
    if(!options.tableName && !options.identity) {
      throw new Error('A tableName or identity property must be set.');
    }
    options.identity = options.identity.toLowerCase();
    options.defaults = this.defaults;

    if(!options.connection){
      options.connection = 'default';
    }
    options = options || {};

    this._attributes = _.clone(this.attributes);
    this.connections = this.connections || {};

    this.defaults = _.merge(COLLECTION_DEFAULTS, this.defaults);

    // Construct our internal objects
    this._cast = new Cast();
    this._schema = new Schema(this);
    this._validator = new Validator();

    // Normalize attributes, extract instance methods, and callbacks
    // Note: this is ordered for a reason!
    this._callbacks = schemaUtils.normalizeCallbacks(this);
    this._instanceMethods = schemaUtils.instanceMethods(this.attributes);
    this._attributes = schemaUtils.normalizeAttributes(this._attributes);

    this.hasSchema = Core._normalizeSchemaFlag.call(this);

    this.migrate = Object.getPrototypeOf(this).hasOwnProperty('migrate') ?
      this.migrate : this.defaults.migrate;

    // Initalize the internal values from the Collection
    Core._initialize.call(this, options);

}
