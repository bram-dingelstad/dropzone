//database.js
var fs = require('fs');
var Datastore = require('nedb');
var db = new Datastore(__dirname + '/dropzone/database.db');
var contents = require('folder-contents');

function add(database_entry) {
  db.loadDatabase();

  if (fs.statSync(database_entry.path).isDirectory()) {
    addDirectory(database_entry)
  }
  else {
    db.update({'name': database_entry.name}, database_entry, {upsert: true}, function (err) {
      console.log('Added database_entry :', database_entry);
      if (err) console.warn('Error adding database_entry', err);
    });
  }

}

function addDirectory(database_entry) {
  var options = {
    "path": database_entry.path,
    "recursively": true,
    "method": "complexPath",
    "filter":{
        "extensionIgnore": [],
        "extensionAccept": [],
        "folderIgnore": ['.git'],
        "fileIgnore": []
    },
    "useFullPath": true
  };
  var index = contents(options);

  console.log('Folder index', index);
}

function list(callback) {
  db.loadDatabase();
  console.log('Getting database_list');

  db.find({}, function (err, database_list) {
    if (err) console.warn('Error getting database_list', err);
    else callback(database_list);
  });
}

function get(query, callback) {
  db.loadDatabase();
  console.log('Getting a database_entry with', query);

  db.findOne({name: query}, function (err, database_entry) {
    if (err) console.warn('Error getting database_entry', err);
    else callback(database_entry);
  });
}

function rem(id) {
  console.log('Removing document with ', id);
  if (typeof id == 'string') db.remove({_id: id});
  else {
    for (i = 0; i < id.length; i++) {
      db.remove({_id: id[i]._id});
    }
  }
}

module.exports = {'add': add, 'list': list, 'get': get, 'rem': rem};
