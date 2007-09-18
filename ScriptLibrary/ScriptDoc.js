// AjaxDoc (c) 2006-2007 Bertrand Le Roy
/// <reference name="MicrosoftAjax.debug.js"/>

Type.registerNamespace("Bleroy");

Bleroy.AjaxDoc = function() {
    /// <summary>A static class that generates XML documents from a JavaScript API.</summary>
};
Bleroy.AjaxDoc.registerClass("Bleroy.AjaxDoc");

Bleroy.AjaxDoc.getDocumentationXml = function Bleroy$AjaxDoc$getDocumentationXml(namespaces, singletons) {
    /// <summary>Generates an XML string containing the extracted documentation.</summary>
    /// <param name="namespaces" type="Array" elementType="String">
    ///   The fully-qualified names of the namespaces to explore.
    /// </param>
    /// <param name="singletons" type="Object">
    ///   A dictionary where the names are the names of the singletons as they must
    ///   be referred to in the documentation and the values are the instance themselves.
    /// </param>
    /// <returns type="String">A string containing the XML documentation.</returns>
    var doc = ["<?xml version=\"1.0\" encoding=\"utf-8\"?>\n\n<doc>\n\t<members>"];
    
    for(var i = 0, l = namespaces.length; i < l; i++) {
        var namespaceName = namespaces[i];
        if (namespaceName === "") {
            // Global namespace
            var jsnamespace = {
                Type: Type,
                Array: Array,
                Boolean: Boolean,
                Date: Date,
                Error: Error,
                Function: Function,
                Number: Number,
                Object: Object,
                RegExp: RegExp,
                String: String
            };
        }
        else {
            jsnamespace = eval(namespaceName);
            Bleroy.AjaxDoc._appendMemberDoc("N", "", namespaceName, doc);
        }
        
        for (var className in jsnamespace) {
            if (className.charAt(0) === '_') continue;
            
            var classPath = namespaceName ? namespaceName + "." + className : className,
                type = jsnamespace[className];
                
            if ((type !== null) && (type instanceof Function) &&
                (Type.isClass(type) || Type.isInterface(type) || Type.isEnum(type))) {
                
                Bleroy.AjaxDoc._appendDoc(type, type.prototype, classPath, doc);
                // Static members
                Bleroy.AjaxDoc._appendMembersDoc(type, null, classPath, doc, type !== Function);
            }
        }
    }
    for (var singletonName in singletons) {
        var instance = singletons[singletonName];
        Bleroy.AjaxDoc._appendDoc(Object.getType(instance), instance, singletonName, doc);
    }
    doc.push("\n\t</members>\n</doc>");
    return doc.join('');
}

Bleroy.AjaxDoc._extractDoc = function Bleroy$AjaxDoc$_extractDoc(code) {
    /// <summary>Extracts the documentation comments from a function's source code.</summary>
    /// <param name="code" type="String">The source code of the function to extract doc comments from.</param>
    /// <returns type="String">A string containing the xml documentation.</returns>
    if (!code) return '';

    var ExtractionRE = /\/\/\/(.*?)\n/gm;
    var match = ExtractionRE.exec(code);
    var functionMatch = /=\s*function\(/gm.exec(code);
    var firstFunctionIndex = code.length;
    if (functionMatch) {
        firstFunctionIndex = functionMatch.index;
    }

    var doc = "";
    while (match && (match.index < firstFunctionIndex)) {
        doc += match[1].trim() + "\n";
        match = ExtractionRE.exec(code);
    }
    return doc;
}

Bleroy.AjaxDoc._appendDoc = function Bleroy$AjaxDoc$_appendDoc(type, object, classPath, doc) {
    /// <summary>Appends the documentation for a type and its members.</summary>
    /// <param name="type" type="Type">The type to extract documentation from.</param>
    /// <param name="object">
    ///   An instance of the type or the prototype. There is no check that the object is an instance of the type.
    /// </param>
    /// <param name="classPath" type="String">The fully-qualified name of the type.</param>
    /// <param name="doc" type="Array" elementType="String">The array to append the new doc strings to.</param>
    var code = type.toString(),
        baseType = type.getBaseType();
        
    if (!baseType) {
        baseType = Object;
    }
    var typeDoc = Bleroy.AjaxDoc._extractDoc(code);
    var xmlDoc = Bleroy.AjaxDoc._createXmlDocument("<doc>" + typeDoc + "</doc>");

    var inherits = (baseType != Object) ? " inheritsFrom=\"" + baseType.getName() + "\"" : "";
    var summaryNode = xmlDoc.selectSingleNode("/doc/summary");
    var summary = summaryNode ? summaryNode.innerText : null;
        
    doc.push("\n\n\t\t<member name=\"T:J#" + classPath + "\"" + inherits +
        (summary ? ">\n\t\t\t" + summary + "\n\t\t</member>" : "/>"));
    
    // Instance members
    if (object) {
        // Fields not present on the prototype/instance:
        var fieldNodes = xmlDoc.selectNodes("/doc/field"),
            fields = {};
        if (fieldNodes) {
            for (var i = 0, l = fieldNodes.length; i < l; i++) {
                var fieldNode = fieldNodes[i];
                var fieldName = fieldNode.getAttribute("name"),
                    fieldDesc = fieldNode.innerText;
                if (typeof(object[fieldName]) === "undefined") {
                    fields[fieldName] = fieldDesc;
                    Bleroy.AjaxDoc._appendMemberDoc("F", fieldDesc, classPath + "." + fieldName, doc);
                }
            }
        }
        Bleroy.AjaxDoc._appendMembersDoc(object, fields, classPath, doc);
    }
}

Bleroy.AjaxDoc._appendMembersDoc = 
    function Bleroy$AjaxDoc$_appendMembersDoc(object, fields, classPath, doc, excludeFunctionPrototypeMembers) {
    /// <summary>Appends the documentation for the members of an object.</summary>
    /// <param name="object">The object to extract documentation from.</param>
    /// <param name="fields" type="Object" mayBeNull="true">The field descriptions for the object's type.</param>
    /// <param name="classPath" type="String">The fully-qualified name of the type.</param>
    /// <param name="doc" type="Array" elementType="String">The array to append the new doc strings to.</param>
    /// <param name="excludeFunctionPrototypeMembers" type="Boolean">
    ///   True if functions that exist on the object's prototype must be excluded.
    /// </param>
    for (var memberName in object) {
        if (memberName.charAt(0) === '_') continue;
        if (excludeFunctionPrototypeMembers && Function.prototype[memberName]) continue;
        var member = object[memberName];
        if (memberName.startsWith("set_") || memberName.startsWith("remove_") || memberName.startsWith("_")) {
            continue;
        }
        var mType,
            memberCode = "",
            memberDoc = "",
            summary = "";
        if (memberName.startsWith("get_")) {
            memberName = memberName.substr(4);
            mType = "P";
            memberCode = member.toString();
            memberDoc = Bleroy.AjaxDoc._extractDoc(memberCode);
        }
        else if (memberName.startsWith("add_")) {
            memberName = memberName.substr(4);
            mType = "E";
            memberCode = member.toString();
            memberDoc = Bleroy.AjaxDoc._extractDoc(memberCode);
        }
        else if (member instanceof Function) {
            mType = "M";
            memberCode = member.toString();
            memberDoc = Bleroy.AjaxDoc._extractDoc(memberCode);
        }
        else {
            mType = "F";
            if (fields) {
                summary = fields[memberName];
                if (typeof(summary) === 'undefined') continue;
            }
            else continue;
        }
        if (mType !== "F") {
            // Remove all attributes but name, turn value into summary.
            var xmlDoc = Bleroy.AjaxDoc._createXmlDocument("<doc>" + memberDoc + "</doc>");
            var nodes = xmlDoc.selectNodes("/doc/*");
            if (nodes) {
                for (var i = 0, l = nodes.length; i < l; i++) {
                    var node = nodes[i];
                    if (node.nodeName === "value") {
                        summary += "\t\t\t<summary>" + node.text + "</summary>\n";
                    }
                    else {
                        var attributes = node.attributes;
                        for (var j = 0, m = attributes.length; j < m; j++) {
                            var attribute = attributes.nextNode();
                            if (attribute.name !== "name") {
                                node.removeAttribute(attribute.name);
                            }
                        }
                        summary += "\t\t\t" + node.xml + "\n";
                    }
                }
            }
        }
        var memberPath = classPath + "." + memberName;
        Bleroy.AjaxDoc._appendMemberDoc(mType, summary, memberPath, doc);
    }
}

Bleroy.AjaxDoc._appendMemberDoc = function Bleroy$AjaxDoc$_appendMemberDoc(memberType, memberDescription, memberPath, doc) {
    /// <summary>Appends the documentation for a field.</summary>
    /// <param name="memberType" type="String">The member type (P, E, M of F).</param>
    /// <param name="memberDescription" type="String">The summary description of the member.</param>
    /// <param name="memberPath" type="String">The fully-qualified name of the member.</param>
    /// <param name="doc" type="Array" elementType="String">The array to append the new doc strings to.</param>
    doc.push("\n\t\t<member name=\"" + memberType + ":J#" + memberPath + "\"" +
        (memberDescription ? ">\n" + memberDescription + "\t\t</member>" : "/>"));
}

Bleroy.AjaxDoc._extractShortName = function Bleroy$AjaxDoc$_extractShortName(fullyQualifiedName) {
    /// <summary>Extracts the last part of a dot-separated name.</summary>
    /// <param name="fullyQualifiedName" type="String">The fully-qualified path.</param>
    /// <returns type="String">The last part of the fully-qualified name.</returns>
    var lastDot = fullyQualifiedName.lastIndexOf('.');
    return ((lastDot == -1) || (lastDot == fullyQualifiedName.length - 1)) ? 
        fullyQualifiedName : fullyQualifiedName.substr(lastDot + 1);
}

Bleroy.AjaxDoc.getReflectionXml = function Bleroy$AjaxDoc$getReflectionXml(projectName, namespaces, singletons) {
    /// <summary>Generates an XML string containing the extracted Reflection documentation.</summary>
    /// <param name="projectName" type="String">The name of the library currently being documented.</param>
    /// <param name="namespaces" type="Array" elementType="String">
    ///   The fully-qualified names of the namespaces to explore.
    /// </param>
    /// <param name="singletons" type="Object">
    ///   A dictionary where the names are the names of the singletons as they must
    ///   be referred to in the documentation and the values are the instance themselves.
    /// </param>
    /// <returns type="String">A string containing the XML documentation.</returns>
    var doc = [
        "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n\n" +
            "<reflection xmlns:js=\"http://www.w3.org/2001/XMLSchema-instance\"\n\t" +
                "js:noNamespaceSchemaLocation=\"reflection.xsd\">\n\t" +
                "<assemblies/>\n\t" +
                "<apis>"],
        genealogy = {},
        innerDoc;
    for(var i = 0, l = namespaces.length; i < l; i++) {
        var namespaceName = namespaces[i];
        if (namespaceName === "") continue;

        var classPath = namespaceName ? namespaceName + "." + className : className,
            jsnamespace = eval(namespaceName);

        for (var className in jsnamespace) {
            if (className.charAt(0) === '_') continue;
            
            var type = jsnamespace[className];
            
            if ((type !== null) && Type.isClass(type)) {
                classPath = namespaceName + "." + className;
                if (!genealogy[classPath]) {
                    genealogy[classPath] = {type: type, ancestors: [], descendants: []};
                }
                for (var ancestor = type.getBaseType(); ancestor; ancestor = ancestor.getBaseType()) {
                    genealogy[classPath].ancestors.push(ancestor);
                    var ancestorPath = ancestor.getName(),
                        ancestorInfo = genealogy[ancestorPath];
                    if (!ancestorInfo) {
                        ancestorInfo = genealogy[ancestorPath] = {type: type, ancestors: [], descendants: []};
                    }
                    ancestorInfo.descendants.push(type);
                }
            }
        }
    }
    
    // Second pass to generate the documentation
    l = namespaces.length;
    for(i = 0; i < l; i++) {
        namespaceName = namespaces[i];
        innerDoc = [];
        if (namespaceName === "") {
            // Global namespace
            jsnamespace = {
                Type: Type,
                Array: Array,
                Boolean: Boolean,
                Date: Date,
                Error: Error,
                Function: Function,
                Number: Number,
                Object: Object,
                RegExp: RegExp,
                String: String
            };
            // Enumerate namespaces for top-level namespaces
            for(var j = 0; j < l; j++) {
                var nsname = namespaces[j];
                if (nsname && (nsname.indexOf('.') === -1)) {
                    jsnamespace[nsname] = eval(nsname);
                }
            }
        }
        else {
            jsnamespace = eval(namespaceName);
        }
        doc.push("\n\n\t\t" +
            "<api id=\"N:J#" + namespaceName +"\">\n\t\t\t" +
                "<apidata group=\"namespace\" name=\"" +
                (Bleroy.AjaxDoc._extractShortName(namespaceName) || "Global") +"\"/>\n\t\t\t" +
                "<elements>");
        
        for (className in jsnamespace) {
            if (className.charAt(0) === '_') continue;
            
            classPath = namespaceName ? namespaceName + "." + className : className;
            type = jsnamespace[className];
            var isNamespace = Type.isNamespace(type),
                isSingleton = !!singletons[classPath];
            
            if (isSingleton) {
                type = type.constructor;
            }
            if ((type !== null) && 
                (isSingleton || Type.isClass(type) || Type.isInterface(type) || Type.isEnum(type) || isNamespace)) {
                
                doc.push(
                    "\n\t\t\t\t<element api=\"" +
                        (isNamespace ? "N:J#" : "T:J#") + 
                        classPath +
                        "\"/>");
                if (!isNamespace) {
                    Bleroy.AjaxDoc._appendReflectionDoc(projectName, type, type.prototype, classPath, genealogy, innerDoc);
                }
            }
        }
        doc.push("\n\t\t\t</elements>\n\t\t</api>");
        doc.push(innerDoc.join(""));
    }
    doc.push(
            "\n\t</apis>\n" +
        "</reflection>");
    return doc.join('');
}

Bleroy.AjaxDoc._appendContainers = function Bleroy$AjaxDoc$_appendContainers(projectName, apiName, doc) {
    /// <summary>Appends container information for an API.</summary>
    /// <param name="projectName" type="String">The name of the library currently being documented.</param>
    /// <param name="apiName" type="String">The name of the API for which to append containers.</param>
    /// <param name="doc" type="Array" elementType="String">The array to append the new doc strings to.</param>
    doc.push("\n\t\t\t<containers>");
    // library
    doc.push("\n\t\t\t\t<library assembly=\"\" module=\"" + projectName + "\"/>");
    // namespace
    var lastDot = apiName.lastIndexOf('.'), namespaceName = "", typeName;
    if (lastDot !== -1) {
        var name = apiName.substr(0, lastDot);
        var api = eval(name);
        if (Type.isNamespace(api)) {
            namespaceName = name;
        }
        else {
            typeName = name;
            lastDot = name.lastIndexOf('.');
            if (lastDot !== -1) {
                namespaceName = name.substr(0, lastDot);
            }
        }
    }
    doc.push("\n\t\t\t\t<namespace api=\"N:J#" + namespaceName + "\"/>");
    // type
    if (typeName) {
        doc.push("\n\t\t\t\t<type api=\"T:J#" + typeName + "\"/>");
    }
    doc.push("\n\t\t\t</containers>");
}

Bleroy.AjaxDoc._appendReflectionDoc =
    function Bleroy$AjaxDoc$_appendReflectionDoc(projectName, type, object, classPath, genealogy, doc) {
    /// <summary>Appends the Reflection documentation for a type and its members.</summary>
    /// <param name="projectName" type="String">The name of the library currently being documented.</param>
    /// <param name="type" type="Type">The type to extract documentation from.</param>
    /// <param name="object">
    ///   An instance of the type or the prototype. There is no check that the object is an instance of the type.
    /// </param>
    /// <param name="classPath" type="String">The fully-qualified name of the type.</param>
    /// <param name="genealogy" type="Object">A structure that contains genealogy information for all the classes.</param>
    /// <param name="doc" type="Array" elementType="String">The array to append the new doc strings to.</param>
    var code = type.toString();
    var typeDoc = Bleroy.AjaxDoc._extractDoc(code);
    var FieldExtractionRE = /<field[^>]*\sname=\"([^\"]*)\"[^>]*(\/>|>[^<]*<\/field>)/gm;
    var fieldMatch = FieldExtractionRE.exec(typeDoc),
        fields = {};
    while (fieldMatch) {
        fields[fieldMatch[1]] = fieldMatch[0];
        fieldMatch = FieldExtractionRE.exec(typeDoc);
    }
    typeDoc = typeDoc.replace(FieldExtractionRE, "").trim();
    
    doc.push("\n\n\t\t" + 
        "<api id=\"T:J#" + classPath + "\">\n\t\t\t" + 
            "<apidata group=\"type\" subgroup=\"" + (
                Type.isClass(type) ? "class" :
                Type.isInterface(type) ? "interface" :
                Type.isEnum(type) ? "enumeration" : ""
            )
            + "\" name=\"" + Bleroy.AjaxDoc._extractShortName(classPath) + "\"/>\n\t\t\t<typedata visibility=\"public\"/>");
    
    // Genealogy
    var typeGenealogy = genealogy[type.getName()];
    if (typeGenealogy && (typeGenealogy.ancestors.length || typeGenealogy.descendants.length)) {
        doc.push("\n\t\t\t<family>");
        var l = typeGenealogy.ancestors.length;
        if (l) {
            doc.push("\n\t\t\t\t<ancestors>");
            for (var i = 0; i < l; i++) {
                doc.push("\n\t\t\t\t\t<type api=\"T:J#" + typeGenealogy.ancestors[i].getName() + "\"/>");
            }
            doc.push("\n\t\t\t\t</ancestors>");
        }
        l = typeGenealogy.descendants.length;
        if (l) {
            doc.push("\n\t\t\t\t<descendents>");
            for (i = 0; i < l; i++) {
                doc.push("\n\t\t\t\t\t<type api=\"T:J#" + typeGenealogy.descendants[i].getName() + "\"/>");
            }
            doc.push("\n\t\t\t\t</descendents>");
        }
        doc.push("\n\t\t\t</family>");
    }
    
    var innerDoc = [];
    if (object) {
        doc.push("\n\t\t\t<elements>");
        if (!Type.isEnum(type)) {
            // Constructor information is extracted for non-global types.
            if (Type.isClass(type) && (type.getName().indexOf('.') !== -1)) {
                doc.push("\n\t\t\t\t<element api=\"M:J#" + classPath + ".#ctor\"/>");
                innerDoc.push("\n\t\t<api id=\"M:J#" + classPath + ".#ctor\">\n\t\t\t" +
                    "<apidata group=\"member\" subgroup=\"constructor\" name=\"#ctor\"/>\n\t\t\t" +
                    "<memberdata visibility=\"public\"/>");
                Bleroy.AjaxDoc._appendMethodParameterReflectionDoc(typeDoc, innerDoc);
                innerDoc.push("\n\t\t\t<returns><type api=\"T:J#" + classPath + "\"/></returns>");
                Bleroy.AjaxDoc._appendContainers(projectName, classPath + ".ctor", innerDoc);
                innerDoc.push("\n\t\t</api>");
            }
            // Instance members
            Bleroy.AjaxDoc._appendMembersReflectionDoc(projectName, object, fields, classPath, innerDoc, doc, type !== Type, false);
        }
        // Static members
        Bleroy.AjaxDoc._appendMembersReflectionDoc(projectName, type, fields, classPath, innerDoc, doc, true, true);
        // Fields not present on the prototype/instance:
        for (var fieldName in fields) {
            if (typeof(object[fieldName]) === "undefined") {
                var fieldDesc = fields[fieldName];
                Bleroy.AjaxDoc._appendFieldReflectionDoc(projectName, fieldDesc, classPath + "." + fieldName, innerDoc, doc);
            }
        }
        doc.push("\n\t\t\t</elements>");
    }
    Bleroy.AjaxDoc._appendContainers(projectName, classPath, doc);
    
    doc.push("\n\t\t</api>");
    doc.push(innerDoc.join(""));
}

Bleroy.AjaxDoc._appendMembersReflectionDoc = 
    function Bleroy$AjaxDoc$_appendMembersReflectionDoc(
        projectName, object, fields, classPath, doc, elementDoc, excludeFunctionPrototypeMembers, isStatic) {
    /// <summary>Appends the Reflection documentation for the members of an object.</summary>
    /// <param name="projectName" type="String">The name of the library currently being documented.</param>
    /// <param name="object">The object to extract documentation from.</param>
    /// <param name="fields" type="Object" mayBeNull="true">The field descriptions for the object's type.</param>
    /// <param name="classPath" type="String">The fully-qualified name of the type.</param>
    /// <param name="doc" type="Array" elementType="String">The array to append the new doc strings to.</param>
    /// <param name="elementDoc" type="Array" elementType="String">The array to append the new element doc strings to.</param>
    /// <param name="excludeFunctionPrototypeMembers" type="Boolean">
    ///   True if functions that exist on the object's prototype must be excluded.
    /// </param>
    /// <param name="isStatic" type="Boolean">True if the member is static.</param>
    for (var memberName in object) {
        if (memberName.charAt(0) === '_') continue;
        if (excludeFunctionPrototypeMembers && Function.prototype[memberName]) continue;
        var member = object[memberName];
        if (memberName.startsWith("set_") || memberName.startsWith("remove_") || memberName.startsWith("_")) {
            continue;
        }
        var mType,
            mSubGroup,
            memberCode = "",
            memberDoc = "";
        if (memberName.startsWith("get_")) {
            memberName = memberName.substr(4);
            mType = "P";
            mSubGroup = "property";
            memberCode = member.toString();
            memberDoc = Bleroy.AjaxDoc._extractDoc(memberCode);
        }
        else if (memberName.startsWith("add_")) {
            memberName = memberName.substr(4);
            mType = "E";
            mSubGroup = "event";
            memberCode = member.toString();
            memberDoc = Bleroy.AjaxDoc._extractDoc(memberCode);
        }
        else if (member instanceof Function) {
            mType = "M";
            mSubGroup = "method";
            memberCode = member.toString();
            memberDoc = Bleroy.AjaxDoc._extractDoc(memberCode);
        }
        else {
            mType = "F";
            mSubGroup = "field";
            if (fields) {
                memberDoc = fields[memberName];
            }
            else continue;
        }
        
        var memberFullName = classPath + "." + memberName;
        var memberPath = mType + ":J#" + memberFullName,
            xmlDoc,
            returnsNode;
        elementDoc.push("\n\t\t\t\t<element api=\"" + memberPath + "\"/>");
        doc.push("\n\t\t<api id=\"" + memberPath + 
            "\">\n\t\t\t<apidata group=\"member\" subgroup=\"" + mSubGroup +
            "\" name=\"" + memberName + "\"/>\n\t\t\t<memberdata visibility=\"public\"" + (isStatic ? " static=\"true\"" : "") + "/>");
            
        switch (mType) {
            case "P":
                doc.push("\n\t\t\t<proceduredata/>\n\t\t\t<propertydata get=\"true\"");
                if (typeof(object["set_" + memberName]) === "function") {
                    doc.push(" set=\"true\"");
                }
                doc.push("/>");
                xmlDoc = Bleroy.AjaxDoc._createXmlDocument("<doc>" + memberDoc + "</doc>");
                returnsNode = xmlDoc.selectSingleNode("/doc/value");
                if (returnsNode) {
                    doc.push("\n\t\t\t<returns>");
                    Bleroy.AjaxDoc._appendTypeReflectionDoc(returnsNode, doc);
                    doc.push("</returns>");
                }
                else {
                    doc.push("\n\t\t\t<returns><type api=\"T:J#(Any)\"/></returns>");
                }
                break;
            case "E":
                doc.push("\n\t\t\t<proceduredata/>\n\t\t\t<eventdata add=\"true\"");
                if (typeof(object["remove_" + memberName]) === "function") {
                    doc.push(" remove=\"true\"");
                }
                doc.push("/>\n\t\t\t<eventhandler><type api=\"T:J#Function\"/></eventhandler>");
                break;
            case "M":
                Bleroy.AjaxDoc._appendMethodParameterReflectionDoc(memberDoc, doc);
                break;
            case "F":
                if (memberDoc) {
                    xmlDoc = Bleroy.AjaxDoc._createXmlDocument(memberDoc);
                    doc.push("\n\t\t\t<fielddata/>\n\t\t\t<returns>");
                    Bleroy.AjaxDoc._appendTypeReflectionDoc(xmlDoc.documentElement, doc);
                    doc.push("</returns>");
                }
                break;
        }
        Bleroy.AjaxDoc._appendContainers(projectName, memberFullName, doc);
        doc.push("\n\t\t</api>");
    }
}

Bleroy.AjaxDoc._appendMethodParameterReflectionDoc =
    function Bleroy$AjaxDoc$_appendMethodParameterReflectionDoc(methodDoc, doc) {
    /// <summary>Appends the documentation for the parameters and the return value.</summary>
    /// <param name="methodDoc" type="String">The XML documentation for the method.</param>
    /// <param name="doc" type="Array" elementType="String">The array to append the new doc strings to.</param>
    var xmlDoc = Bleroy.AjaxDoc._createXmlDocument("<doc>" + methodDoc + "</doc>");
    doc.push("\n\t\t\t<proceduredata/>");
    var paramNodes = xmlDoc.selectNodes("/doc/param");
    if (paramNodes && (paramNodes.length > 0)) {
        doc.push("\n\t\t\t<parameters>");
        for (var i = 0, l = paramNodes.length; i < l; i++) {
            var paramNode = paramNodes[i];
            doc.push("\n\t\t\t\t<parameter name=\"" + 
                paramNode.getAttribute("name") +
                "\"");
            if (paramNode.getAttribute("parameterArray") === "true") {
                doc.push(" params=\"true\"");
            }
            doc.push(">");
            Bleroy.AjaxDoc._appendTypeReflectionDoc(paramNode, doc);
            if (paramNode.getAttribute("optional") === "true") {
                doc.push("<nullValue/>");
            }
            doc.push("</parameter>");
        }
        doc.push("\n\t\t\t</parameters>");
    }
    var returnsNode = xmlDoc.selectSingleNode("/doc/returns");
    if (returnsNode) {
        doc.push("\n\t\t\t<returns>");
        Bleroy.AjaxDoc._appendTypeReflectionDoc(returnsNode, doc);
        doc.push("</returns>");
    }
}

Bleroy.AjaxDoc._appendTypeReflectionDoc =
    function Bleroy$AjaxDoc$_appendTypeReflectionDoc(typeNode, doc) {
    /// <summary>Appends type information.</summary>
    /// <param name="typeNode">The XML node that contains the type information.</param>
    /// <param name="doc" type="Array" elementType="String">The array to append the new doc strings to.</param>
    var typeName = typeNode.getAttribute("type");
    var isArray = (typeName === "Array");
    if (isArray) {
        typeName = typeNode.getAttribute("elementType");
        doc.push("<arrayOf rank=\"1\">");
    }
    doc.push("<type api=\"T:J#");
    if (typeName) {
        doc.push(typeName);
        if (typeNode.getAttribute(isArray ? "elementInteger" : "integer") === "true") {
            doc.push("(Integer)");
        }
    }
    else if (typeNode.getAttribute(isArray ? "elementDomElement" : "domElement") === "true") {
        doc.push("(DomElement)");
    }
    else {
        doc.push("(Any)");
    }
    doc.push("\"/>");
    if (isArray) {
        doc.push("</arrayOf>");
    }
}

Bleroy.AjaxDoc._appendFieldReflectionDoc =
    function Bleroy$AjaxDoc$_appendFieldReflectionDoc(projectName, fieldDescription, fieldPath, doc, elementDoc) {
    /// <summary>Appends the Reflection documentation for a field.</summary>
    /// <param name="projectName" type="String">The name of the library currently being documented.</param>
    /// <param name="fieldDescription" type="String">The XML documentation of the field.</param>
    /// <param name="fieldPath" type="String">The fully-qualified name of the field.</param>
    /// <param name="doc" type="Array" elementType="String">The array to append the new doc strings to.</param>
    /// <param name="elementDoc" type="Array" elementType="String">The array to append the new element doc strings to.</param>
    var fieldDoc = Bleroy.AjaxDoc._createXmlDocument(fieldDescription).documentElement;
    elementDoc.push("\n\t\t\t\t<element api=\"F:J#" + fieldPath + "\"/>");
    doc.push("\n\t\t<api id=\"F:J#" + fieldPath + "\">" +
        "\n\t\t\t<apidata group=\"member\" subgroup=\"field\" name=\"" +
        Bleroy.AjaxDoc._extractShortName(fieldPath) + "\"/>" +
        "\n\t\t\t<memberdata visibility=\"public\"/>\n\t\t\t<fielddata/>\n\t\t\t<returns>");
    Bleroy.AjaxDoc._appendTypeReflectionDoc(fieldDoc, doc);
    doc.push("</returns>");
    Bleroy.AjaxDoc._appendContainers(projectName, fieldPath, doc);
    doc.push("\n\t\t</api>");
}

Bleroy.AjaxDoc._createXmlDocument = function Bleroy$AjaxDoc$_createXmlDocument(xml) {
    /// <summary>Creates an XML document from an xml string.</summary>
    /// <param name="xml" type="String">The XML.</param>
    /// <returns>A XML DOM document.</returns>
    if (window.ActiveXObject) {
        var xmlDOM = new ActiveXObject("Microsoft.XMLDOM");
        xmlDOM.async = false;
        xmlDOM.loadXML(xml);
        xmlDOM.setProperty('SelectionLanguage', 'XPath');
        return xmlDOM;
    }
    else {
        throw new Error("This tool only works on Internet Explorer.");
    }
    return null;
}