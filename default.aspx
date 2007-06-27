<%@ Page Language="C#" ValidateRequest="false" EnableViewState="false" %>
<%@ Import Namespace="System.IO" %>
<%@ Import Namespace="System.Xml" %>
<script runat="server">
    /* This application generates documentation for JavaScript libraries.
     *
     * It generates XML documentation files that have the same format as C#
     * documentation files and that can be processed by existing tools such as SandCastle.
     *
     * Documentation is generated from the source code of the classes defined in
     * files and namespaces defined in a project file. The project to use is specified
     * using the project query string parameter. For example, if you have built the
     * project file myProject.xml in the Projects directory, browsing to
     * default.aspx?project=myProject will generate the file Output/myProject.xml
     * documentation file.
     *
     * The tool can work in the absence of specific documentation information in the
     * source code but the usefulness of such documentation will be small.
     * To include real documentation, you can use the /// comments that are familiar
     * to C# developers with one essential difference: the comments have to be
     * inside of the class or method definition.
     *
     * Here's an example of class documentation:
     *
     * Sys.Data.DataView = function() {
     *    /// <summary>
     *    ///   DataView filters its input data through a collection of filters.
     *    ///   It can also paginate and sort data.
     *    /// </summary>
     *
     *    // [... actual definition of the class ...]
     * }
     *
     *
     * Here's an example of method documentation:
     *
     * this.getItem = function(index) {
     *    /// <summary>
     *    ///   Gets an item in the filtered data by index.
     *    /// </summary>
     *    /// <param name="index">The index in the filtered data of the row to return.</param>
     *    /// <returns>Null if the row was not found.</returns>
     *
     *    return _filteredTable ? _filteredTable[index] : null;
     * }
     *
     *
     * And finally, here's an example of a property's documentation (notice how the
     * documentation is on the getter only, not on the setter):
     *
     * this.get_data = function() {
     *    /// <summary>
     *    ///   The data that the view will filter.
     *    /// </summary>
     *
     *    return _data;
     * }
     * this.set_data = function(data) {
     *    _data = data;
     * }
     *
     *
     * Events can't be documented using this tool for the moment.
     *
     * To be able to write the output XML file, the application must have write access to the output directory.
     * For this reason and also because I didn't especially look for possible injection attacks,
     * this application should never be exposed publicly on the Internet.
     * I recommend making it only accessible locally.
     *
     * For all this to work, the application must be installed in an Atlas-enabled application.
     * This means the right web.config, Atlas dll and of course the script files that you wish to document.
     * 
    */
    public string projectName;
    public string namespaces, singletons;

    protected override void OnPreInit(EventArgs e) {
        base.OnPreInit(e);

        // Determine the project name
        projectName = new Regex(@"[^\w]").Replace(Request.QueryString["project"] ?? "", "");
        if (String.IsNullOrEmpty(projectName)) {
            projectName = "MicrosoftAjax";
        }

        // Read the project file
        XmlDocument projectDoc = new XmlDocument();
        projectDoc.Load(Server.MapPath("Projects/" + projectName + ".project.xml"));
        // Add the project's script references
        foreach (XmlNode scriptNode in projectDoc.SelectNodes("/project/scripts/script")) {
            ScriptReference scriptRef = new ScriptReference();
            
            XmlAttribute scriptNameAttribute = scriptNode.Attributes["name"];
            if (scriptNameAttribute != null) {
                scriptRef.Name = scriptNameAttribute.Value;
            }
            
            XmlAttribute scriptAssemblyAttribute = scriptNode.Attributes["assembly"];
            if (scriptAssemblyAttribute != null) {
                scriptRef.Assembly = scriptAssemblyAttribute.Value;
            }

            XmlAttribute scriptPathAttribute = scriptNode.Attributes["path"];
            if (scriptPathAttribute != null) {
                scriptRef.Path = scriptPathAttribute.Value;
            }

            scriptManager.Scripts.Add(scriptRef);
        }
        
        // Preparing the namespace list for the project
        StringBuilder namespacesBuilder = new StringBuilder("['");
        bool first = true;
        foreach (XmlNode namespaceNode in projectDoc.SelectNodes("/project/namespaces/namespace")) {
            string jsnamespace = namespaceNode.InnerText;
            if (!first) {
                namespacesBuilder.Append("','");
            }
            else {
                first = false;
            }
            namespacesBuilder.Append(jsnamespace);
        }
        namespacesBuilder.Append("']");
        namespaces = namespacesBuilder.ToString();
        
        // Preparing the singleton list for the project
        StringBuilder singletonListBuilder = new StringBuilder("{");
        first = true;
        foreach (XmlNode singletonNode in projectDoc.SelectNodes("/project/singletons/singleton")) {
            string singletonCode = singletonNode.InnerText;
            XmlAttribute singletonNameAttribute = singletonNode.Attributes["name"];
            string singletonName = (singletonNameAttribute != null ? singletonNameAttribute.Value : singletonCode);
            if (!first) {
                singletonListBuilder.Append(",");
            }
            else {
                first = false;
            }
            singletonListBuilder.Append('\'');
            singletonListBuilder.Append(singletonName);
            singletonListBuilder.Append("':");
            singletonListBuilder.Append(singletonCode);
        }
        singletonListBuilder.Append('}');
        singletons = singletonListBuilder.ToString();

        // Outputting the results to disk on posts
        string doc = Request.Form["XmlDoc"];
        if (doc != null) {
            string xmlDocOutputPath = "Output/" + projectName + ".xml";
            using (StreamWriter writer =
                new StreamWriter(Server.MapPath(xmlDocOutputPath))) {

                writer.Write(doc);
            }
            XmlDoc.Visible = false;
            resultsLabel.Text = "Xml documentation for project " +
                Server.HtmlEncode(projectName) +
                " can be found at <a href=\"" +
                Server.HtmlEncode(xmlDocOutputPath) +
                "\" target=\"_blank\">" +
                Server.HtmlEncode(xmlDocOutputPath) +
                "</a>";
        }
        doc = Request.Form["Reflection"];
        if (doc != null) {
            string reflectionOutputPath = "Output/" + projectName + ".org";
            using (StreamWriter writer =
                new StreamWriter(Server.MapPath(reflectionOutputPath))) {

                writer.Write(doc);
            }
            Reflection.Visible = false;
            resultsLabel.Text += "<br/>Reflection information for project " +
                Server.HtmlEncode(projectName) +
                " can be found at <a href=\"" +
                Server.HtmlEncode(reflectionOutputPath) +
                "\" target=\"_blank\">" +
                Server.HtmlEncode(reflectionOutputPath) +
                "</a>";
        }
    }
</script>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head runat="server" id="head">
    <title>ScriptDoc - JavaScript documentation generator</title>
    <% if (Request.RequestType == "GET") { %>
    <script type="text/javascript">
        function pageLoad() {
            var namespaces = <%= namespaces %>;
            var singletons = <%= singletons %>;
            var doc = Bleroy.ScriptDoc.getReflectionXml("<%= projectName %>", namespaces, singletons);
            document.getElementById("Reflection").value = doc;
            doc = Bleroy.ScriptDoc.getDocumentationXml(namespaces, singletons);
            document.getElementById("XmlDoc").value = doc;
            document.forms[0].submit();
        }
    </script>
    <% } %>
</head>
<body>
    <form runat="server">
        <asp:ScriptManager ID="scriptManager" runat="server" EnablePartialRendering="false">
            <Scripts>
                <asp:ScriptReference Path="~/ScriptLibrary/ScriptDoc.js" />
            </Scripts>
        </asp:ScriptManager>
        <div>
            <h1>ScriptDoc - JavaScript documentation generator.</h1>
            <asp:TextBox runat="server" Columns="120" Rows="24" id="XmlDoc" TextMode="MultiLine"/>
            <asp:TextBox runat="server" Columns="120" Rows="24" id="Reflection" TextMode="MultiLine"/>
        </div>
    </form>

    <asp:Label runat="server" ID="resultsLabel" />
</body>
</html>
