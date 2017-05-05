# AjaxDoc - Obsolete

This project is preserved here, but should not be used. Use [JsDoc](http://usejsdoc.org/) instead.

This works as an ASP.NET 2.0 web application.

Documentation is generated from the source code of the classes defined in files and namespaces defined in a project file. The project to use is specified using the project query string parameter. For example, if you have built the project file `myProject.xml` in the Projects directory, browsing to `default.aspx?project=myProject` will generate the `Output/myProject.xml` and `Output/myProject.org` documentation and reflection files.

The tool can work in the absence of specific documentation information in the source code but the usefulness of such documentation will be small.
To include real documentation, you can use the `/// comments` that are familiar to C# developers with one essential difference: the comments have to be inside of the class or method definition.

Here's a simple example of class documentation:

```js
Sys.Data.DataView = function() {
   /// <summary>
   ///   DataView filters its input data through a collection of filters.
   ///   It can also paginate and sort data.
   /// </summary>

   // [... actual definition of the class ...]
}
```

Here's an example of method documentation:

```js
this.getItem = function(index) {
   /// <summary>
   ///   Gets an item in the filtered data by index.
   /// </summary>
   /// <param name="index">The index in the filtered data of the row to return.</param>
   /// <returns>Null if the row was not found.</returns>

   return _filteredTable ? _filteredTable[index] : null;
}
```

And finally, here's an example of a property's documentation (notice how the
documentation is on the getter only, not on the setter):

```js
this.get_data = function() {
   /// <value>
   ///   The data that the view will filter.
   /// </value>

   return _data;
}
this.set_data = function(data) {
   _data = data;
}
```

More information about the format of doc comments for JavaScript can be found [here](http://weblogs.asp.net/bleroy/archive/2007/04/23/the-format-for-javascript-doc-comments.aspx).

To be able to write the output XML file, the application must have write access to the output directory. For this reason and also because I didn't especially look for possible injection attacks, *this application should never be exposed publicly on the Internet*. I recommend making it only accessible locally.

One more thing: for all this to work, the application must be installed in an ASP.NET Ajax application. This means the right web.config, that ASP.NET Ajax is installed on the machine and of course the script files that you wish to document are where the project file points.

*This should not be confused with [ScriptDoc](http://scriptdoc.org/), or [JSDoc](http://jsdoc.sourceforge.net/)*, which are annotation formats for JavaScript. ScriptDoc is a name I originally picked before I learned about those and that describes the extraction tool. I since renamed the project to "AjaxDoc" which seems to be unused currently. The annotation format that the tool uses, and which is described [elsewhere](http://weblogs.asp.net/bleroy/archive/2007/04/23/the-format-for-javascript-doc-comments.aspx), should be referred to as "JavaScript doc comments".
