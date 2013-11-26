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

## Example/Demo

Examples are maintained in [this repository](https://github.com/trestletech/giza-example).

## Architecture

### Data Typing

The notion of "types" is very loose in Giza. Types can be thought of as a character "tag" which can be associated with an object, but has no ability to enforce, restrict, or require any qualities or properties of the object. Types are primarily provided for the following reasons:

 1. In the short term, types are used to help guide Giza regarding how an object should be serialized (i.e. which assembler should be used) or to filter to a particular type of object. Where possible, the type of data is returned alongside an object (not as an attribute of the object, but in another channel) to avoid altering the underlying object.
 2. In the long-term, it may be possible to leverage data types to persist data in Giza into another system like MongoDB.

We're very open to input currently regarding how typing should be configured in Giza. We've intentionally left a lot of flexibility so we can later hone in exactly how we want it to work.

### Data Organization

Data retrieved from Giza will be returned in a hierarchical format corresponding to the path locations at which the data was stored. Objects stored in Giza will, where possible, remain unaltered. Meaning that we strive to make the following cycle idempotent.

```
var obj = {a:1, b:2};
giza.save('/path', obj)
obj = giza.get('/path')
```

We do this by keeping the attributes of the object as "first-class citizens" of the returned object, so that `obj.a` returns `1` both before and after storing the object in Giza.

However, this gets complicated when we attempt to recursively pull a tree of objects in from Giza, as we need to distinguish properties of an object (like `a` and `b` above) from children. To facilitate this, we preface all children with a forward slash. So you can expect the following:

```
var obj = {a:1, b:2};
giza.save('/path', obj);
giza.save('/path/a', {c : 1});
giza.get('/path');
```

would return:

```
{
  'a' : 1,
  'b' : 2,
  '/a' : {
    'c' : 1
  }
}
```

In general, it will be easier to use the `find` and `get` commands to traverse trees of objects rather than traversing the trees returned from a call to `get` yourself. But if it needs to be done, you can expect this convention to be applied constently when returning objects recursively from Giza.

## Features

### Data Storage

Data in Giza is stored in a hierarchical model, using paths separated by forward-slashes (`/`), much like how directories are organized on a computer. You can interact with the data stored in Giza using `save()`, `get()`, `delete()`, `exists()`, and `find()`.

#### `save(path, val, type)`

Saves an object into Giza

 - `path` - The path (address) at which the incoming object should be saved.
 - `val` - The object to save.
 - `type` - (Optional) - The string name of the "class" or "type" to associate with this object. See [Data Typing](https://github.com/trestletech/giza#data-typing).

#### `get(path, options)`

Gets an object out of Giza.

 - `path` - The path (address) of the object to retrieve.
 - `options` - (Optional) - A map with any of the following properties:
   - `recursive` - `false` - Whether or not to get the entire tree under this path. If true, will get this object and all children, if false will just get this object. See [Data Organization](https://github.com/trestletech/giza#data-organization) to understand how the object will be structured if this is true.
   - `includeComputed` - `true` - If true, will include the values computed by triggers associated with this path, if false, will omit them.
   - `assembler` - Override the default assembler associated with data of whatever type this object is and use the provided assembler instead to serialize the data.
   - `callback` - Convenient way to register a callback while getting data. Just handles the registry of this callback function using `subscribe()` on this path, inherting the `recursive` property you defined here, if any. 

#### `delete(path)`

Delete an object and all associated callbacks from Giza.

 - `path` - The path (address) of the object to delete.
 
#### `exists(path)`

Determine whether or not a path exists in Giza.

 - `path` - The path (address) of the object to investigate.

#### `find(filter, options)`

Find all objects in Giza which match the provided filter. Currently only supports filtering based on object type. Returns a map of objects which passed the filter indexed by their path.

 - `filter` - An object with any of the following fields:
   - `types` - A string (or array of strings) specifying the types of data which should be included in the returned map.
 - `options` -  Options passed into the `get` call used to retrieve each matching object.

### Publish/Subscribe

Events and subscriptions can be created to correspond to any path stored in Giza. This allows systems to emit events on an object stored at a particular path, or to subscribe to events associated with a particular path.

Giza uses a "bubbling" publish/subscribe model to handle events. In this system, events emitted on an object will "bubble up" through all parent paths. For instance, an event emitted on `/abc/def` would initially be emitted on the targetted object (`/abc/def`), then its parent (`/abc`), then the root object (`/`), giving all ancestors and their listeners the opportunity to respond to this event.

There are three primary functions that will be used to emit or subscribe to events.

#### `subscribe(path, callback, options)`

Add a subscription to a particular path, optionally on only certain types of events.

 - `path` - The path on which to subscribe.
 - `callback` - The function to execute when a matching event is emitted on this object. The callback will be executed with the following signature:
   - `event` - The name of the event emitted.
   - `source` - An object typically containing (at least) three fields detailing the source of the event that was emitted.
     - `path` -  The path associated with the original event
     - `obj` -  The object on which the original event was emitted
     - `type` - The "type" associated with the original object
   - `...` - Any other arguments passed into the `emit` call.
 - `options` - A map containing any of the following fields:
   - `bubble` - `true` - If true, will also subscribe on all events bubbling to/past this object. If false, will only emit on events targetting this particular node.
   - `filters` - N/A - An array of objects specifying the filters associated with this subscription. If provided, only events which match these filters will execute the callback. If the emitted event matches any of the filters in this array, it will be passed through. The objects can have the following properties
     - `names` - A string or array of strings specifying the event name(s) which should be included in this filter. If empty, will allow all names through.
     - `types` - A string or array of strings specifying the origin object type(s) which should be included in this filter. Events targetting objects of a type not included in this string/array will be excluded. If empty, will allow all types through.
   - `triggered` - `true` - If true, will include triggered events in the subscription. If false, will not fire on events originating from a trigger.

#### `emit(path, event, ...)`

 - `path` - The path on which we should emit
 - `event` - The name of the event to emit.
 - `...` - Any other arguments which will be passed into all `subscribe` callbacks.

#### `unsubscribe(path, callback)`

Unsubscribe a callback which is currently registered.

 - `path` - The path with which the callback is registered
 - `callback` -  The callback which should be unsubscribed.

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

TODO

 - mocha
