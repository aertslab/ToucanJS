angular.module("ToucanJS")
.factory('IDB', function($rootScope, $q, $timeout) {
    // service handle
    var idb = {};

    // debugging flag
    var debug = 0;

    // internal DB handler
    var toucanDB;
    var toucanDBVersion = 5;

    // active requests counter
    $rootScope.DBRequests = 0;

    // check for IDB support
    if (!window.indexedDB) {
        window.alert("Your browser doesn't support a stable version of IndexedDB. Please upgrade your browser.");
        return idb;
    }

    // setting up Toucan DB
    idb.connect = function() {
        return $q(function(resolve, reject) {
            var DBOpenRequest = window.indexedDB.open("ToucanDB", toucanDBVersion);

            // error handler for opening Toucan DB
            DBOpenRequest.onerror = function(event) {
                console.log("ToucanDB error", event);
                alert('Error loading a ToucanDB');
                reject(event);
            };

            // success handler for opening Toucan DB
            DBOpenRequest.onsuccess = function(event) {
                // DB handle
                toucanDB = DBOpenRequest.result;

                // error handler for transactions on Toucan DB
                toucanDB.onerror = function(evt) {
                    console.log("ToucanDB error", evt);
                    alert("ToucanDB error: " + evt.target.error);
                };

                resolve(event);
            };

            // update handler for Toucan DB
            DBOpenRequest.onupgradeneeded = function(event) {
                console.log("Updating ToucanDB");

                // updated DB handler
                var db = this.result;

                // update error handler
                db.onerror = function(event) {
                    console.log("ToucanDB error", event);
                    alert("ToucanDB error: " + event.target.error);
                };

                // recreate files store
                try {
                    db.deleteObjectStore("files");
                } catch (err) {}
                db.createObjectStore("files", { keyPath: "ID", autoIncrement: true })
                    .createIndex("name", "name", { unique: false });

                // recreate sequences store
                try {
                    db.deleteObjectStore("sequences");
                } catch (err) {}
                db.createObjectStore("sequences", { keyPath: "seqID", autoIncrement: false });

                // recreate features store
                try {
                    db.deleteObjectStore("features");
                } catch (err) {}
                db.createObjectStore("features", { keyPath: "ID", autoIncrement: false });

                // recreate options store
                try {
                    db.deleteObjectStore("options");
                } catch (err) {}
                db.createObjectStore("options", { keyPath: "ID", autoIncrement: false });
            };

        });
    }

    // remove all entries from store
    function DBClear(store) {
        if (debug) console.log('DBClear ', store);
        return $q(function(resolve, reject) {
            $rootScope.DBRequests++;
            var t = toucanDB.transaction(store, "readwrite")
                .objectStore(store)
                .clear();
            t.onsuccess = function(event) {
                // resolve with event data
                resolve(event);
                $rootScope.DBRequests--;
                $timeout(function() {
                    $rootScope.$apply();
                });
            }
            t.onerror = function(event) {
                // reject with error message
                reject(event.target.error);
                $rootScope.DBRequests--;
                alert("ToucanDB clear error: " + event.target.error);
            };
        });
    }

    // get store entry for given key
    function DBGet(store, key) {
        return $q(function(resolve, reject) {
            $rootScope.DBRequests++;
            var t = toucanDB.transaction(store)
                .objectStore(store)
                .get(key);
            t.onsuccess = function(event) {
                // resolve with entry
                var entry = event.target.result;
                if (debug) console.log('DBGet ', store, entry);
                resolve(entry);
                $rootScope.DBRequests--;
                $timeout(function() {
                    $rootScope.$apply();
                });
            };
            t.onerror = function(event) {
                // reject with error message
                reject(event.target.error);
                $rootScope.DBRequests--;
                alert("ToucanDB get error: " + event.target.error);
            };
        });
    }

    // get all entries from given store
    function DBGetAll(store) {
        return $q(function(resolve, reject) {
            $rootScope.DBRequests++;
            let list = [];
            var t = toucanDB.transaction(store)
                .objectStore(store)
                .openCursor();
            t.onsuccess = function(event) {
                var cursor = event.target.result;
                if (cursor) {
                    list.push(cursor.value);
                    cursor.continue();
                } else {
                    // resolve with array of entries
                    if (debug) console.log('DBGetAll ', store, list);
                    resolve(list);
                    $rootScope.DBRequests--;
                    $timeout(function() {
                        $rootScope.$apply();
                    });
                }
            };
            t.onerror = function(event) {
                // reject with error message
                reject(event.target.error);
                $rootScope.DBRequests--;
                alert("ToucanDB get error: " + event.target.error);
            };
        });
    }

    // save a given entry in the store
    function DBSave(store, obj) {
        if (debug) console.log('DBSave ', store, obj);
        return $q(function(resolve, reject) {
            $rootScope.DBRequests++;
            var t = toucanDB.transaction(store, "readwrite")
                .objectStore(store)
                .put(obj);
            t.onsuccess = function(event) {
                // resolve with updated key
                resolve(event.target.result);
                $rootScope.DBRequests--;
                $timeout(function() {
                    $rootScope.$apply();
                });
            };
            t.onerror = function(event) {
                // reject with error message
                reject(event.target.error);
                $rootScope.DBRequests--;
                alert("ToucanDB save error: " + event.target.error);
            };
        })
    }

    function DBDelete(store, id) {
        if (debug) console.log('DBDelete ', store, id);
        return $q(function(resolve, reject) {
            $rootScope.DBRequests++;
            var t = toucanDB.transaction(store, "readwrite")
                .objectStore(store)
                .delete(id);
            t.onsuccess = function(event) {
                // resolve with event data
                resolve(event);
                $rootScope.DBRequests--;
                $timeout(function() {
                    $rootScope.$apply();
                });
            };
            t.onerror = function(event) {
                // reject with error message
                reject(event.target.error);
                $rootScope.DBRequests--;
                alert("ToucanDB delete error: " + event.target.error);
            };
        })
    }

    // handlers for sequences store

    idb.saveSequence = function(seq) {
        return DBSave("sequences", seq);
    }

    idb.deleteSequence = function(seqID) {
        return DBDelete("sequences", seqID);
    }

    idb.getAllSequences = function() {
        return DBGetAll("sequences");
    }

    // handlers for features store

    idb.saveFeature = function(feature) {
        return DBSave("features", feature);
    }

    idb.deleteFeature = function(featureID) {
        return DBDelete("features", featureID);
    }

    idb.getAllFeatures = function() {
        return DBGetAll("features");
    }

    // handlers for files store

    idb.saveFile = function(file) {
        return DBSave("files", file);
    }

    idb.deleteFile = function(fileID) {
        return DBDelete("files", fileID);
    }

    idb.getAllFiles = function() {
        return DBGetAll("files");
    }

    // handlers for options store

    idb.saveOptions = function(opts) {
        return DBSave("options", opts);
    }

    idb.getOptions = function(key) {
        return DBGet("options", key);
    }

    // general handlers

    idb.clearAll = function() {
        return $q(function(resolve, reject) {
            DBClear("files").then(function() {
                DBClear("sequences").then(function() {
                    DBClear("features").then(function() {
                        DBClear("options").then(function() {
                            resolve();
                        });
                    });
                });
            });
        });
    }

    return idb;
});