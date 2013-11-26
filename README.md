Giza
======

Giza is an JavaScript library available on `npm` which provides the following features:

 - Storage of data in a hierarchical format.
 - A bubbling event system (publish/subscribe) appropriate for hierarchical data, with the ability to filter on event or data types.
 - Support for [Assemblers](http://martinfowler.com/eaaCatalog/dataTransferObject.html) to be used when converting in-memory objects to/from DTOs appropriate for client digestion.
 - Embeddable 'triggers' which supplement an object based on descendant events.
 
These features are each described in greater detail below and form the backbone of a modern, event-driven representational state transfer (REST) alternative.

## Installation & Usage

Giza can be installed using the following command:

```
npm install giza
```

To use Giza, you can instantiate it after loading the Giza module like so:

```
var Giza = require('giza').Giza; // Load the Giza constructor
var giza = new Giza(); // Instantiate a new Giza instance.
```

This `giza` variable can then either be passed around or loaded into the global environment, as is appropriate.

## Features

### Data Storage

Data in Giza is stored in a hierarchical model, using paths separated by forward-slashes (`/`), much like how directories are organized on a computer. You can interact with the data stored in Giza using `save()`, `get()`, `delete()`, `exists()`, and `find()`.

#### `save(path, val, type)`

 - `path` - 
 - `val` - 
 - `type` - 

#### `get(path, options)`

 - `path` - 
 - `options` - 

 #### `delete(path)`

 - `path` - 
 
 #### `exists(path)`

 - `path` - 

 #### `find(filter, options)`

 - `filter` - 
 - `options` -  

### Publish/Subscribe

Events and subscriptions can be created to correspond to any path stored in Giza. This allows systems to emit events on an object stored at a particular path, or to subscribe to events associated with a particular path.

Giza uses a "bubbling" publish/subscribe model to handle events. In this system, events emitted on an object will "bubble up" through all parent paths. For instance, an event emitted on `/abc/def` would initially be emitted on the targetted object (`/abc/def`), then its parent (`/abc`), then the root object (`/`), giving all ancestors and their listeners the opportunity to respond to this event.

There are three primary functions that will be used to emit or subscribe to events.

#### `subscribe(path, callback, options)`

#### `emit(path, event, ...)`

#### `unsubscribe(path, callback)`

Note that you can also register a subscription when `get`ting data using the `callback` option.

### Assemblers

[Assemblers](http://martinfowler.com/eaaCatalog/dataTransferObject.html) are an architectural concept used to translate in-memory objects to/from a Data Transfer Object (DTO). For instance, your `User` class may store an individuals bank account, but you may not want that field to be serialized to your clients when they retrieve information about that user. An assembler could be defined that would instruct Giza to omit that field from their serialized version of the object. Different assemblers can be defined for different `type`s of data in Giza. Giza supports custom Assemblers for your data types, or provides a few templates out-of-the-box, all of which are exported by Giza and can be accessed as follows: 

```
var assemblers = require('giza').assemblers;
```

#### Passthrough Assembler

```
var passthrough = new require('giza').assemblers.Passthrough();
```

This is the default and, as the name implies, it merely passes all data through to/from the client. All properties of an object will be de/serialized when using this assembler. If no other assembler is specified, this is the one that will be used.

#### Blacklist Assembler

```
var blacklist = new require('giza').assemblers.Blacklist(['bank_acct', 'ssn']);
```

Provides the opporunity to "scrub" particular fields from the object before serializing, as in the bank account example mentioned above. The constructor accepts one argument which can either be a Regular Expression or an array of field names; any matches to this regex or array of strings will be scrubbed before serializing the data.

When deserializing, the data coming in from the client will be merged with the existing data but the blacklisted fields will not be overwritten, even if provided by the client. For instance, if `ssn` is a black-listed field, the existing `ssn` property of the object in Giza will remain, regardless of whether or not the client passed back an object with an `ssn` field.

#### Whitelist Assembler

```
var whitelist = new require('giza').assemblers.Whitelist(['fname', 'lname']);
```

The opposite of a Blacklist Assembler, a Whitelist Assembler will enumerate all properties which should be included in the serialized DTO. The constructor accepts one argument which can either be a Regular Expression or an array of field names; only property names that match this regex or array of strings will be included in the DTO.

When deserializing, the data coming in from the client will be merged with the existing data by **only** overwriting the whitelisted fields -- not other fields will be altered, even if the client provides them.

#### Custom Assemblers

// To Document...

### Triggers

Giza provides the concept of Triggers which can be used to automatically update a property of an object based on its descendants' bubbling events. This can be useful to, e.g. update a counter of available resources by monitoring the update events emitted on descendant objects. In the [hotel example](https://github.com/trestletech/giza-example/blob/master/hotel/lib/main.js#L10) a trigger is used to keep track of the available rooms in the hotel by listening for updates on rooms' "vacant" property. These triggers could, of course, be injected at any level in the hierarchy to maintain a count of vacancies by hotel, building, or floor.

A trigger's callback function should return a value which will then be associated with the object on which the trigger was added. For instance, a trigger named `vacancy` may have a callback function that returns the number of vacant rooms in a hotel. From then on, the `vacancy` property will be added to the associated `hotel` object on which the trigger was added.

Triggers are added using the `addTrigger()` function.

#### `addTrigger(path, name, callback, thisArg)`

 - `path` - The path of the object on which the trigger should be added. Must exist in giza already.
 - `name` - The name of the trigger. This defines the property name in the object, as well as the name of the event that will be emitted when this trigger is executed.
 - `callback` - The function to be executed when an event bubbles past this object. The callback will be called with the same signature as an event subscription's callback.
 - `thisArg` - The value of `this` when executing the callback.

## Development

mocha