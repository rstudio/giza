Giza
======

Giza is an JavaScript library available on `npm` which provides the following features:

 - Storage of data in a hierarchical format.
 - A bubbling event system (publish/subscribe) appropriate for hierarchical data, with the ability to filter on event or data types.
 - Support for [Assemblers](http://martinfowler.com/eaaCatalog/dataTransferObject.html) to be used when converting in-memory objects to/from DTOs appropriate for client digestion.
 - Embeddable 'triggers' which supplement an object based on descendant events.
 
These features are each described in greater detail below and form the backbone of a modern, event-driven representational state transfer (REST) alternative.

## Installation

```
npm install giza
```

## Features

### Data Storage

Data in Giza is stored in a hierarchical model, using paths separated by forward-slashes (`/`).

### Publish/Subscribe


### Assemblers


### Triggers


## Development

mocha