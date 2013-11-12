exports.cleanPath = cleanPath;
/**
 * Sanitize a path of trailing slashes and check for malformed paths.
 */
function cleanPath(path){
  if (!path){
    return path;
  }

  if (path.match(/\/\//)){
    throw new Error("Invalid path: paths cannot contain consecutive slashes.");
  }

  if ( !path.match(/^\//) ){
    throw new Error("Invalid path: paths must begin with a '/'.");
  }

  // Replace trailing slash(es)
  path = path.replace(/(.)\/$/, '$1');

  return path;
}