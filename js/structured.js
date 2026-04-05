var baseurl;
var editor;
var editorSvg
var searchString;
var propertiesCache = {};
var symbolCache = {};
var schemaCache = {};
var endpointSymbolCache = {};
var endpointSchemaCache = {};
var unsavedBlacklist = {};
var symbolString;
var resourceid = "NONE";
var symbolurl
var schemaurl
var selectedSymbol
var selectedSchema
var selectedEndpoint

$(document).ready(function() {
  $("#new_schema_input").val("");
  $("#new_symbol_input").val("");
  $("#new_endpoint_input").val("");
  editor = ace.edit("schema_editor");
  editor.setTheme("ace/theme/monokai");
  editor.session.setMode("ace/mode/xml");
  editor.setOptions({
    maxLines: Infinity
  });
  editorSvg = ace.edit("symbol_editor");
  editorSvg.setTheme("ace/theme/monokai");
  editorSvg.session.setMode("ace/mode/xml");
  editorSvg.setOptions({
    maxLines: Infinity
  });
  baseurl = $("#resourceurl_input").val();
  symbolurl = baseurl + "/symbols/";
  schemaurl = baseurl + "/schemas/"
  Promise.all([get_resources_better(), get_symbols(), get_schemas()]).then(function(){
    sort_endpoints_by_symbol();
    sort_endpoints_by_schema();
  }
  );
 
  check_current_sorter();
  $(document).on('click', '.detailViewButton, .resource_better td.link', function(){
    $("#details div.x-ui-layout").removeClass('hidden');
    $(".resource_better").each(function(){
      $(this).removeClass("detail_selected");
    })
    $(this).parents("tr").addClass("detail_selected");
    resourceid = $(this).parents("tr").attr("resource-id");
    selectedEndpoint = resourceid;
    get_schema_from_cache(resourceid);
    get_symbol_from_cache(resourceid);
    get_properties(resourceid);
  
  });
  $(document).on('click', '.symbol_detailViewButton, .symbol_resource_better td.link', function(){
    $("#symbols_details div.x-ui-layout").removeClass('hidden');
    $("#symbols_table tr").each(function(){
      $(this).removeClass("detail_selected");
    })
    $(this).parents("tr").addClass("detail_selected");
    resourceid = $(this).parents("tr").attr("resource-id");
    selectedSymbol = resourceid;
    get_symbol_ace(resourceid);
  });
  $(document).on('click', '.schema_detailViewButton, .schema_resource_better td.link', function(){
    $("#schemas_details div.x-ui-layout").removeClass('hidden');
    $("#schemas_table tr").each(function(){
      $(this).removeClass("detail_selected");
    })
    $(this).parents("tr").addClass("detail_selected");
    resourceid = $(this).parents("tr").attr("resource-id");
    selectedSchema = resourceid;
    get_schema_ace(resourceid);
  });
  $(document).on('click', '#add_property', function(){
    var node = $($("#dat_template_properties")[0].content.cloneNode(true));
    var prop = $("#properties_table");
    prop.append(node);
  });
  $(document).on('click', '#add_search_property', function(){
    var node = $($("#dat_template_properties")[0].content.cloneNode(true));
    var prop = $("#search_properties_table");
    prop.append(node);
  });
  $(document).on('click', '#resourceurl_button', function(){
    baseurl = $("#resourceurl_input").val();
    get_resources_better();
  });
  $(document).on("click", ".copyButton",function(){
    navigator.clipboard.writeText(decodeURIComponent($(this).parents("tr").attr("resource-id")));
  })
  $(document).on('click', '#search_button', function(){
    searchString = $("#search_input").val();
    search_endpoints(searchString);
  });
  $(document).on("keydown", "#search_input, #search_properties_table li input", function(e){
    if(e.key === 'Enter') {
      e.preventDefault();
      $("#search_button").click();
    }
  })
  $(document).on('click', ".remover_of_properties", function(){
    $(this).closest('.property').remove();
  })
  $(document).on('input', "#symbol_editor textarea", function(){
    update_symbol();
  })
  $(document).on('change', "#symbol_editor textarea", function(){
    update_symbol();
  })
  $(document).on('input', "#schema_editor textarea", function(){
    update_schema_preview();
  })
  $(document).on('change', "#schema_editor textarea", function(){
    update_schema_preview();
  })
  $(document).on("click", "#save_schema", function(){
    saveTextAsFile(editor.getValue(), "schema.rng", "application/xml");
  })
  $(document).on("click", "#save_symbol", function(){
    saveTextAsFile(editorSvg.getValue(), "symbol.svg", "application/xml");
  })
  $(document).on("click", "#save_properties", function(){
    if(!$("#properties_table").is(":empty")){
      save_properties();
    }
  })
  $(document).on("change", "#default_symbol_edge", function(){
    update_symbol();
  })
  $(document).on("change", "#sort_picker", function(){
    check_current_sorter();
  })
  $(document).on("change", "#symbol_picker, #schema_picker", function(){
    update_schema_preview(true, schemaCache[$("#schema_picker").val()])
    update_symbol(true, symbolCache[$("#symbol_picker").val()])
  })
  $(document).on("click", "#new_endpoint_button", function(){
    create_new_endpoint();    
  })
  $(document).on("click", "#new_symbol_button", function(){
    create_new_symbol();    
  })
  $(document).on("click", "#new_schema_button", function(){
    create_new_schema();    
  })
  $(document).on("mouseover", "#symbol_preview_interactive_old g, #symbol_preview_interactive g", function(){
    $(this).addClass("hover");
  })
  $(document).on("mouseleave", "#symbol_preview_interactive_old g, #symbol_preview_interactive g", function(){
    $(this).removeClass("hover");
  })
  $(document).on("click", "#symbol_preview_interactive_old g, #symbol_preview_interactive g", function(){
    $(this).addClass("selected");
  })
  $(document).on("click", function(x){
    var clickTarget = $(x.target);
    if(!clickTarget.closest("#symbol_preview_interactive_old g, #symbol_preview_interactive g, .interactive_button").length){
      $("#symbol_preview_interactive_old g").removeClass("selected");
      $("#symbol_preview_interactive g").removeClass("selected");
    }
  })
  $(document).on("click", "#symbol_preview_interactive_start_button, #symbol_preview_interactive_start_button_old",function(){
    $("#symbol_preview_interactive_old g").addClass("active");
    $("#symbol_preview_interactive g").addClass("active");
  })
  $(document).on("click", "#symbol_preview_interactive_stop_button, #symbol_preview_interactive_stop_button_old", function(){
    $("#symbol_preview_interactive_old g").removeClass("active");
    $("#symbol_preview_interactive g").removeClass("active");
    $("#symbol_preview_interactive_old g").addClass("passive");
    $("#symbol_preview_interactive g").addClass("passive");
  })
  $(document).on("click", "#symbol_preview_interactive_reset_button, #symbol_preview_interactive_reset_button_old", function(){
    $("#symbol_preview_interactive_old g").removeClass("active passive");
    $("#symbol_preview_interactive g").removeClass("active passive");
  })
  $(document).on("mouseover", ".general_resource", function(){
    $(this).addClass("hover");
  })
  $(document).on("mouseleave", ".general_resource td.link", function(){
    $(this).removeClass("hover");
  })
  $(document).on("click", "#symbol_details .save_changes", function(){
    change_symbol(editorSvg.getValue(), selectedSymbol,"PUT")
  })
  $(document).on("click", "#schema_details .save_changes", function(){
    change_schema(editor.getValue(), selectedSchema,"PUT")
  })
  $(document).on("click", "#details .save_changes", function(){
    put_endpoint(selectedEndpoint)
  })
  $(document).on("click", "#symbol_details .delete_object", function(){
    if(window.confirm("Are you sure you want to delete the Symbol "+ selectedSymbol)){
      delete_symbol(selectedSymbol);
    }
  })
  $(document).on("click", "#schema_details .delete_object", function(){
    if(window.confirm("Are you sure you want to delete the Schema "+ selectedSchema +"?")){
      delete_schema(selectedSchema);
    }
  })
  $(document).on("click", "#details .delete_object", function(){
    if(window.confirm("Are you sure you want to delete the Endpoint "+ selectedEndpoint +"?")){
      delete_endpoint(selectedEndpoint);
    }
  })
  $(document).on("change", "#symbol_details .load_object", function(){
    if(this.files[0] && this.files[0]!=''){
      this.files[0].text().then((content) => temp_load_symbol(content));
    }
  })
  $(document).on("change", "#schema_details .load_object", function(){
    if(this.files[0] && this.files[0]!=''){
      this.files[0].text().then((content) => temp_load_schema(content));
    }
  })
})

function temp_load_symbol(symbol_string){
  editorSvg.setValue(symbol_string);
  update_symbol(false, editorSvg.getValue());
}

function temp_load_schema(schema_string){
  editor.setValue(schema_string);
  update_schema_preview(false, editor.getValue());
}

function get_schema_from_cache(resid){
  if(endpointSchemaCache[resid]){
    $("#schema_preview_old").removeClass("hidden");
    update_schema_preview(true, endpointSchemaCache[resid]);
    check_for_fits(false, endpointSchemaCache[resid]);
  } else{
    $("#schema_preview_old").addClass("hidden");
    $("#schema_picker").val("CUSTOM")
  }
}
function get_symbol_from_cache(resid){
  if(endpointSymbolCache[resid]){
    update_symbol(true, endpointSymbolCache[resid]);
    check_for_fits(true, endpointSymbolCache[resid]);
  } else {
    $("#symbol_preview_old").addClass("hidden");
    $("#symbol_preview_extra_old").addClass("hidden");
    $("#symbol_preview_interactive_div_old").addClass("hidden");
    $("#symbol_picker").val("CUSTOM");
  }
}

function create_new_schema(){
  var name = $("#new_schema_input").val();
  if(!name.includes(".rng")){
    name = name + ".rng";
  } 
  if(!schemaCache[name] && name!=".rng"){
    schemaCache[name] = '<element rngui:version="1.2" rngui:header="Arguments" name="arguments" datatypeLibrary="http://www.w3.org/2001/XMLSchema-datatypes" xmlns="http://relaxng.org/ns/structure/1.0" xmlns:rngui="http://rngui.org">\n  <element name="timeout" rngui:label="Duration">\n    <data type="float" rngui:label="duration in seconds"/>\n  </element>\n  <element name="data" rngui:header="Data">\n    <zeroOrMore rngui:label="New Data Element">\n      <element rngui:label="Name">\n        <anyName/>\n        <data type="string" rngui:label="Value"/>\n      </element>\n    </zeroOrMore>\n  </element>\n</element>'
    $("#new_schema_input").val("");
    change_schema(schemaCache[name], name, "POST");
  } else {
    alert("Invalid Schema name: Schema name empty or Schema with same name already exists")
  }
  
}
function create_new_symbol(){
  var name = $("#new_symbol_input").val();
  if(!name.includes(".svg")){
    name = name + ".svg";
  } 
  if(!symbolCache[name] && name!=".svg"){
    symbolCache[name] = '<svg class="clickable" xmlns="http://www.w3.org/2000/svg">\n  <g class="part-normal">\n    <circle cx="15" cy="15" r="14" class="colorstyle execstyle stand"/>\n    <circle cx="15" cy="15" r="11" class="colorstyle stand"/>\n  </g>\n</svg>'

    $("#new_symbol_input").val("");
    change_symbol(symbolCache[name], name, "POST");
  } else {
    alert("Invalid Symbol name: Symbol name empty or Symbol with same name already exists")
  }
}

function change_symbol(symbolContent, symbolName, type){
  return $.ajax({
    type: type,
    url: symbolurl + symbolName,
    data: symbolContent,
    contentType: "application/xml",
    dataType: "text",
    success: function(res){

    }, error: function(a,b,c){
      alert("POST failed; Server-res: " + a + " ||| " + b + " ||| " + c)
    }
  }).then(function(){
    get_symbols();
    get_resources_better();
  })
}

function change_schema(schemaContent, schemaName, type){
  return $.ajax({
    type: type,
    url: schemaurl + schemaName,
    data: schemaContent,
    contentType: "application/xml",
    dataType: "text",
    success: function(res){

    }, error: function(a,b,c){
      alert("POST failed; Server-res: " + a + " ||| " + b + " ||| " + c)
    }
  }).then(function(){
    get_schemas();
    get_resources_better();
  })
}

function post_endpoint(endpointName){
  return $.ajax({
    type: "POST",
    url: baseurl + "/endpoints/" + endpointName,
    success: function(res){

    }, error: function(a,b,c){
      alert("POST failed; Server-res: " + a + " ||| " + b + " ||| " + c)
    }
  }).then(function(){
    get_resources_better();
  })
}

function put_endpoint(endpointName){
  put_endpoint_symbol(endpointName).then(
    put_endpoint_schema(endpointName).then(
      handle_properties(endpointName).then(
        get_resources_better()
      )
    )
  )
}
function put_endpoint_symbol(endpointName){
  if($("#symbol_picker").val() == "CUSTOM"){
    return;
  }
  return $.ajax({
    type: "PUT",
    url: baseurl + "/endpoints/" + endpointName + "/symbol.svg",
    processData: false,
    contentType: "text/plain",
    data: $("#symbol_picker").val(),
    success: function(res){

    }, error: function(a,b,c){
      alert("Symbol PUT failed; Server-res: " + a + " ||| " + b + " ||| " + c)
    }
  })
}
function put_endpoint_schema(endpointName){
  if($("#schema_picker").val() == "CUSTOM"){
    return;
  }
  return $.ajax({
    type: "PUT",
    url: baseurl + "/endpoints/" + endpointName + "/schema.rng",
    processData: false,
    contentType: "text/plain",
    data: $("#schema_picker").val(),
    success: function(res){

    }, error: function(a,b,c){
      alert("Symbol PUT failed; Server-res: " + a + " ||| " + b + " ||| " + c)
    }
  })
}
function delete_symbol(symbolName){
  return $.ajax({
    type: "DELETE",
    url: baseurl + "/symbols/" + symbolName,
    success: function(res){

    }, error: function(a,b,c){
      alert("Symbol DELETE failed; Server-res: " + a + " ||| " + b + " ||| " + c)
    }
  }).then(function(){
    get_symbols();
    $("#symbols_details div.x-ui-layout").addClass('hidden');
  })
}
function delete_schema(schemaName){
  return $.ajax({
    type: "DELETE",
    url: baseurl + "/schemas/" + schemaName,
    success: function(res){

    }, error: function(a,b,c){
      alert("Schema DELETE failed; Server-res: " + a + " ||| " + b + " ||| " + c)
    }
  }).then(function(){
    get_schemas();
    $("#schemas_details div.x-ui-layout").addClass('hidden');
  })
}
function delete_endpoint(endpointName){
  return $.ajax({
    type: "DELETE",
    url: baseurl + "/endpoints/" + endpointName,
    success: function(res){

    }, error: function(a,b,c){
      alert("Endpoint DELETE failed; Server-res: " + a + " ||| " + b + " ||| " + c)
    }
  }).then(function(){
    get_resources_better();
    $("#details div.x-ui-layout").addClass('hidden');
  })
}

function create_new_endpoint(){

  var name = $("#new_endpoint_input").val();

  if(!(endpointSymbolCache[name] || endpointSchemaCache[name] || propertiesCache[name]) && name!="" ){

    $("#new_endpoint_input").val("");
    post_endpoint(encodeURIComponent(name))
  } else {
    alert("Invalid Endpoint name: Endpoint name empty or Endpoint with same name already exists")
  }
}

function check_empty_sorting_buckets(){
  $(".sorting_bucket").each(function(){
    $(this).removeClass("hidden")
    if($(this).find("table").is(":empty")) {
      $(this).addClass("hidden");
    } else {
      let emp = true;
      $(this).find("table").find("tr").each(function(){
        if(!$(this).hasClass("hidden")){
          emp = false;
        }
      })
      if(emp) {
        $(this).addClass("hidden");
      }
    }
  })
}

function check_current_sorter(){
  $("#resources_better_sorted_symbol").addClass("hidden");
  $("#resources_better_sorted_schema").addClass("hidden");
  $("#resources_better").addClass("hidden");
  if($("#sort_picker").val()=="Symbol") {
    $("#resources_better_sorted_symbol").removeClass("hidden");
  }
  if($("#sort_picker").val()=="Schema") {
    $("#resources_better_sorted_schema").removeClass("hidden");
  }
  if($("#sort_picker").val()=="NONE") {
    $("#resources_better").removeClass("hidden");
  }
}

function sort_endpoints_by_symbol() {
  $("#resources_better_sorted_symbol").empty()

  endpointSymbolCache = Object.keys(endpointSymbolCache).sort().reduce(function(obj, key){obj[key]=endpointSymbolCache[key]; return obj},{});
  symbolCache = Object.keys(symbolCache).sort().reduce(function(obj, key){obj[key]=symbolCache[key]; return obj},{});
  Object.keys(symbolCache).forEach(function(symKey){
    if(symKey!="CUSTOM") {
    var node = $($("#dat_template_sorting_bucket")[0].content.cloneNode(true));
    node.find('summary').text(symKey);
    node.attr('sym-id', symKey);
    Object.keys(endpointSymbolCache).forEach(function(key){
      if(endpointSymbolCache[key] == symbolCache[symKey]){
        var elemNode = $($("#dat_template_resources_better")[0].content.cloneNode(true));
        $('.link',elemNode).text(decodeURIComponent(key));
        elemNode.find('tr').attr('resource-id',key);
        if(unsavedBlacklist[key]){
          elemNode.find("tr").addClass("unsaved");
        }
        node.find("table").append(elemNode);
      }
    })
    $("#resources_better_sorted_symbol").append(node);
    }
  })
}

function sort_endpoints_by_schema() {
  $("#resources_better_sorted_schema").empty()
  endpointSchemaCache = Object.keys(endpointSchemaCache).sort().reduce(function(obj, key){obj[key]=endpointSchemaCache[key]; return obj},{});
  schemaCache = Object.keys(schemaCache).sort().reduce(function(obj, key){obj[key]=schemaCache[key]; return obj},{});

  Object.keys(schemaCache).forEach(function(symKey){
    if(symKey!="CUSTOM") {
    var node = $($("#dat_template_sorting_bucket")[0].content.cloneNode(true));
    node.find('summary').text(symKey);
    node.attr('sch-id', symKey);
    
    Object.keys(endpointSchemaCache).forEach(function(key){
      if(endpointSchemaCache[key] == schemaCache[symKey]){

        var elemNode = $($("#dat_template_resources_better")[0].content.cloneNode(true));
        $('.link',elemNode).text(decodeURIComponent(key));
        elemNode.find('tr').attr('resource-id',key);
        if(unsavedBlacklist[key]){
          elemNode.find("tr").addClass("unsaved");
        }
        node.find("table").append(elemNode);
      }
    })
    $("#resources_better_sorted_schema").append(node);
    }
  })
}

function check_for_fits(isSym, resStr) {
  var found = false;
  if(isSym){
    symbolCache["CUSTOM"] = "NONE";
    Object.keys(symbolCache).forEach(function(key){
      if(resStr == symbolCache[key]) {
        $("#symbol_picker").val(key);
        found = true;
      }
    });
    if(!found){
      $("#symbol_picker").val("CUSTOM");
      symbolCache["CUSTOM"] = resStr;
    }
    $('#symbol_picker option').removeClass("current");
    $('#symbol_picker option[value="'+$("#symbol_picker").val()+'"]').addClass("current");
  }
  if(!isSym){
    schemaCache["CUSTOM"] = "NONE";
    Object.keys(schemaCache).forEach(function(key){
      if(resStr == schemaCache[key]) {
        $("#schema_picker").val(key);
        found = true;
      }
    });
    if(!found){
      $("#schema_picker").val("CUSTOM");
      schemaCache["CUSTOM"] = resStr;
    }
    $('#schema_picker option').removeClass("current");
    $('#schema_picker option[value="'+$("#schema_picker").val()+'"]').addClass("current");
  } 

}

function get_schemas(){

  $("#schemas_table").empty();
  $("#schema_picker").empty();
  return $.ajax({
    type: "GET",
    url: schemaurl,
    dataType: "html",
  }).then(function(res){
      const promises = $(res).find('resource').map(function(){
        let rngName = $(this).text();
        var schema_table = $("#schemas_table");
        if(rngName.includes(".rng")){
          return $.ajax({
            type: "GET",
            url: schemaurl + rngName,
            dataType: "xml",
            success: function(res2){
              var node = $($("#dat_template_schema_resources_better")[0].content.cloneNode(true));
              node.find('tr').attr('resource-id',rngName);
              $('.link',node).text(rngName);
              schema_table.append(node);
              schemaCache[rngName] = new XMLSerializer().serializeToString(res2);
              var selectnode = $($("#dat_template_picker")[0].content.cloneNode(true));
              selectnode.find("option").text(rngName);
              selectnode.find("option").attr("value", rngName);
              $("#schema_picker").append(selectnode);
            }
          })
        }
      })
      return(Promise.allSettled(promises.get()));
    },
    function(a,b,c) {
      alert("Something wrong with get_schemas");
    }).then(function(){
    var selectnode = $($("#dat_template_picker")[0].content.cloneNode(true));
    selectnode.find("option").text("CUSTOM");
    selectnode.find("option").attr("value", "CUSTOM");
    $("#schema_picker").append(selectnode);
    })
}

function get_symbol_ace(resid){
  editorSvg.setValue(symbolCache[resid], -1);
  update_symbol();
}

function get_schema_ace(resid){
  editor.setValue(schemaCache[resid], -1);
  update_schema_preview();
}

function get_symbols() {
  $("#symbols_table").empty();
  $("#symbol_picker").empty();
  return $.ajax({
    type: "GET",
    url: symbolurl,
    dataType: "html",
  }).then(function(res){
      const promises = $(res).find('resource').map(function(){
        let svgName = $(this).text();
        var symbol_table = $("#symbols_table");
        if(svgName.includes(".svg")){
          return $.ajax({
            type: "GET",
            url: symbolurl + svgName,
            dataType: "xml",
            success: function(res2){
              var node = $($("#dat_template_symbol_resources_better")[0].content.cloneNode(true));
              node.find('tr').attr('resource-id',svgName);
              $('.link',node).text(svgName);
              symbol_table.append(node);
              symbolCache[svgName] = new XMLSerializer().serializeToString(res2);
              var selectnode = $($("#dat_template_picker")[0].content.cloneNode(true));
              selectnode.find("option").text(svgName);
              selectnode.find("option").attr("value", svgName);
              $("#symbol_picker").append(selectnode);
            }
          })
        }
      })
      return(Promise.allSettled(promises.get()));
    },
    function(a,b,c) {
      alert("Something wrong with get_symbols");
    }).then(function(){
    var selectnode = $($("#dat_template_picker")[0].content.cloneNode(true));
    selectnode.find("option").text("CUSTOM");
    selectnode.find("option").attr("value", "CUSTOM");
    $("#symbol_picker").append(selectnode);
    
  })
}

function save_properties (){
  var saveString = "{"
  $("#properties_table li").each(function(){
    saveString = saveString + '"' + $(this).find(".key").val() + '"' + ":" +'"' + $(this).find(".elem").val() + '"' + ",";
  })
  saveString = saveString.slice(0,-1) + "}";
  saveJson = JSON.parse(saveString);

  saveTextAsFile(JSON.stringify(saveJson, null, 2), "properties.json", "application/json");
}

function change_properties(propertiesContent, endpointName, type){
  return $.ajax({
    type: type,
    url: baseurl + '/endpoints/' + endpointName + '/properties.json',
    data: JSON.stringify(propertiesContent),
    contentType: "application/json",
    dataType: "text",
    success: function(res){

    }, error: function(a,b,c){
      alert("POST failed; Server-res: " + a + " ||| " + b + " ||| " + c)
    }
  }).then(function(){
    get_resources_better();
  })
}

function handle_properties(endpointName){
  if($("#properties_table").is(':empty')) {
    if(propertiesCache[endpointName] != "NONE") {
      if(window.confirm("Are you sure you want to delete the Properties.json of the Endpoint "+ selectedEndpoint +"?")){
        delete_properties(endpointName)
      }
    }
  } else {
    var saveString = "{"
    $("#properties_table li").each(function(){
      saveString = saveString + '"' + $(this).find(".key").val() + '"' + ":" +'"' + $(this).find(".elem").val() + '"' + ",";
    })
    saveString = saveString.slice(0,-1) + "}";
    saveJson = JSON.parse(saveString);
    if(propertiesCache[endpointName] != "NONE") {
      change_properties(saveJson, endpointName, "PUT");
    } else {
      change_properties(saveJson, endpointName, "POST");
    }
  }
}

function delete_properties(endpointName){
  return $.ajax({
    type: "DELETE",
    url: baseurl + "/endpoints/" + endpointName + "/properties.json",
    success: function(res){

    }, error: function(a,b,c){
      alert("Properties DELETE failed; Server-res: " + a + " ||| " + b + " ||| " + c)
    }
  }).then(function(){
    get_resources_better();
  })
}
function saveTextAsFile(text, filename, type) {
  const blob = new Blob([text], { type });
  const element = document.createElement('a');
  element.href = URL.createObjectURL(blob);
  element.download = filename;
  element.click();
  URL.revokeObjectURL(element.href);
}


function search_endpoints(searchString){
  $(".resource_better").each(function(){
    $(this).addClass("hidden")
    var nameFound = false;
    var propFound = true;
    var searchResourceID = $(this).attr("resource-id")
    if(searchResourceID.includes(searchString) | decodeURIComponent(searchResourceID).includes(searchString)){
      nameFound = true;
    }
    $("#search_properties_table li").each(function() {
      var key = $(this).find('.key').val();
      var value = $(this).find('.elem').val();
      var data = propertiesCache[searchResourceID];
      if (key && value && data && data[key] && data[key].includes(value) || !value && data && data[key] || !key && !value) {
        propFound = propFound;
      } else {
        propFound = false;
      }
    });
    if(nameFound === true && propFound === true) {
      $(this).removeClass("hidden")
    }
  });
  check_empty_sorting_buckets();
  
}

function update_schema_preview(hasNoEditor, schStr) {
  var suffix = "";
  var schemaString;
  if(hasNoEditor){
    schemaString = schStr;
    suffix = "_old";
  } else {
    schemaString = editor.getValue();
  }

  $("#schema_preview"+suffix).empty();
  if(schemaString!="No schema :("){
    schema_content = new DOMParser().parseFromString(schemaString, "text/xml");
    let rngui = new RelaxNGui(schema_content, $('#schema_preview'+suffix), eval, true)
    rngui.save();
  }
}

function get_properties(resid){
  var propertiesurl = baseurl + '/endpoints/' + resid + '/properties.json';
  var prop = $('#properties_table');
  prop.empty();	
  $.ajax({
    type: "GET",
    url: propertiesurl,
    dataType: "json",
    success: function(res){
      $.each(res, function(key, value){
        var node = $($("#dat_template_properties")[0].content.cloneNode(true));
        $("#properties_name").text("from: " + propertiesurl);
	      $("#properties_name").attr("href", propertiesurl);
        $('.key', node).attr("value", key);
        $('.elem', node).attr("value", value)
        prop.append(node);
      })
    }, 
    error: function(a,b,c){
	    $("#properties_name").text("No Properties in " + propertiesurl);
    }  
  })
}

function cache_properties(resid) {
  var propertiesurl = baseurl + '/endpoints/' + resid + '/properties.json';
  $.ajax({
    type: "GET",
    url: propertiesurl,
    dataType: "json",
    success: function(res){
      propertiesCache[resid] = res;
    }, error: function(a,b,c){
      propertiesCache[resid] = "NONE"
    }
  })
}

function get_resources_better() {
  var resourceurl = baseurl + '/endpoints/';
  return $.ajax({
    type: "GET",
    url: resourceurl,
    dataType: "xml",
  }).then(function(res){
      var endp = $("#resources_better");
      endp.empty();
      const promises = $(res).find('resource').map(function(){
        var uri_bare = $(this).text();
        var uri = decodeURIComponent(uri_bare);
        var node = $($("#dat_template_resources_better")[0].content.cloneNode(true));
        $('.link',node).text(uri);
        node.find('tr').attr('resource-id',uri_bare);
        endp.append(node);
        cache_properties($(this).text());
        return $.ajax({
          type: "GET",
          url: resourceurl + uri_bare + "/symbol.svg",
          dataType: "xml",
          success: function(res2){
            endpointSymbolCache[uri_bare] = new XMLSerializer().serializeToString(res2);
          }
        })
      });
      const promises2 = $(res).find('resource').map(function(){
        var uri_bare = $(this).text();
        return $.ajax({
          type: "GET",
          url: resourceurl + uri_bare + "/schema.rng",
          dataType: "xml",
          success: function(res3){
            endpointSchemaCache[uri_bare] = new XMLSerializer().serializeToString(res3);
          }
        })
      });
      const promisesAll = promises.get().concat(promises2.get())
      return(Promise.allSettled(promisesAll));
    }, function(a,b,c) {
      alert("Server not running.");
    }
  )
}

function update_symbol(hasNoEditor, symStr) {
  var suffix = "";
  if(hasNoEditor){
    symbolString = symStr;
    suffix = "_old";
  } else {
    symbolString = editorSvg.getValue();
  }
  
  if(symbolString!="No symbol :("){
    let symbolXml = new DOMParser().parseFromString(symbolString, "text/xml")
    let part_normal = $(symbolXml).find('[class="part-normal"]');
    let part_checkmark = 
      '<g class="hoverstyle markstyle" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="2" cy="0" r="7"/>' +
        '<path d="m -1 0 l 2 2 l 4 -4" class="standline"/>' +
      '</g>';
    if(part_normal.length != 0) {
      symbolString= new XMLSerializer().serializeToString(part_normal[0]);
    } else {
        symbolString = '<g class="part-normal">'+symbolString+"</g>"
    }
    symbolString = symbolString + part_checkmark;
    
    let part_extra_string = '<g class="part-extra" transform=""><rect x="23" y="21" width="12" height="12" rx="2" class="execstylethin stand colorstyle"></rect><path transform="translate(25.5,23.3)" class="normal" style="fill:#000000;" d="M 0,5.352539 1.9277344,5.0585937 q 0.1230468,0.5605469 0.4990234,0.8544922 0.3759766,0.2871092 1.0527344,0.2871092 0.7451172,0 1.1210937,-0.2734373 0.2529297,-0.1914063 0.2529297,-0.5126953 0,-0.21875 -0.1367187,-0.3623047 Q 4.5732422,4.915039 4.0742187,4.7988281 1.75,4.2861328 1.1279297,3.8623047 0.2666016,3.274414 0.2666016,2.2285156 q 0,-0.9433594 0.7451171,-1.5859375 Q 1.7568359,0 3.3222656,0 4.8125,0 5.5371094,0.4853515 6.2617184,0.9707031 6.5351564,1.9208984 L 4.7236328,2.2558594 Q 4.6074219,1.8320312 4.2792969,1.6064453 3.9580078,1.3808594 3.3564453,1.3808594 q -0.7587891,0 -1.0869141,0.211914 -0.21875,0.1503906 -0.21875,0.3896485 0,0.2050781 0.1914063,0.3486328 0.2597656,0.1914062 1.7910156,0.540039 1.5380863,0.3486328 2.1464843,0.8544922 0.601563,0.5126953 0.601563,1.4287109 0,0.9980473 -0.833985,1.7158203 -0.833984,0.717774 -2.4677732,0.717774 -1.4833985,0 -2.3515625,-0.601563 Q 0.2666016,6.3847661 0,5.352539 Z"></path></g>'
    let activeTextString = '<text class="super" transform="translate(20,-2)" xmlns="http://www.w3.org/2000/svg"><tspan class="exec necessary">▶</tspan><tspan class="active necessary">1</tspan><tspan class="colon">,</tspan><tspan class="vote">0</tspan></text>'
   
    let symbolStringPlusExtra = symbolString + part_extra_string;
    let symbolStringPlusActive = symbolString + activeTextString;
    let symbolStringPlusExtraActive = symbolStringPlusExtra + activeTextString;
    symbolString = '<g class="element primitive" element-id="undefined">' + symbolString + '</g>'
    symbolStringPlusExtra = '<g class="element primitive" element-id="undefined">' + symbolStringPlusExtra + '</g>';
    symbolStringPlusActive = '<g class="element primitive" element-id="undefined">' + symbolStringPlusActive + '</g>'
    symbolStringPlusExtraActive = '<g class="element primitive" element-id="undefined">' + symbolStringPlusExtraActive + '</g>'
    $("#symbol_preview"+ suffix).removeClass("hidden");
    $("#symbol_preview_normal"+ suffix).html(symbolString);
    $("#symbol_preview_hover"+ suffix).html(symbolString);
    $("#symbol_preview_hover"+ suffix+ " g").addClass("hover");
    $("#symbol_preview_selected"+ suffix).html(symbolString);
    $("#symbol_preview_selected"+ suffix+ " g").addClass("selected");
    $("#symbol_preview_hover_selected"+ suffix).html(symbolString);
    $("#symbol_preview_hover_selected"+ suffix+ " g").addClass("hover");
    $("#symbol_preview_hover_selected"+ suffix+ " g").addClass("selected");
     $("#symbol_preview_active"+ suffix).html(symbolStringPlusActive);
    $("#symbol_preview_active"+ suffix+ " g").addClass("active");
    $("#symbol_preview_active_hover"+ suffix).html(symbolStringPlusActive);
    $("#symbol_preview_active_hover"+ suffix+ " g").addClass("active");
    $("#symbol_preview_active_hover"+ suffix+ " g").addClass("hover");
    $("#symbol_preview_passive"+ suffix).html(symbolString);
    $("#symbol_preview_passive"+ suffix+ " g").addClass("passive");


    
    $("#symbol_preview_extra"+ suffix).removeClass("hidden");
    $("#symbol_preview_extra_normal"+ suffix).html(symbolStringPlusExtra);
    $("#symbol_preview_extra_hover"+ suffix).html(symbolStringPlusExtra);
    $("#symbol_preview_extra_hover"+ suffix+ " g").addClass("hover");
    $("#symbol_preview_extra_selected"+ suffix).html(symbolStringPlusExtra);
    $("#symbol_preview_extra_selected"+ suffix+ " g").addClass("selected");
    $("#symbol_preview_extra_hover_selected"+ suffix).html(symbolStringPlusExtra);
    $("#symbol_preview_extra_hover_selected"+ suffix+ " g").addClass("hover");
    $("#symbol_preview_extra_hover_selected"+ suffix+ " g").addClass("selected");
    $("#symbol_preview_extra_active"+ suffix).html(symbolStringPlusExtraActive);
    $("#symbol_preview_extra_active"+ suffix+ " g").addClass("active");
    $("#symbol_preview_extra_passive"+ suffix).html(symbolStringPlusExtra);
    $("#symbol_preview_extra_passive"+ suffix+ " g").addClass("passive");
    
    $("#symbol_preview_interactive_div" + suffix).removeClass("hidden");
    $("#symbol_preview_interactive" + suffix).html(symbolString);
    $("#symbol_preview_interactive" + suffix + " g").addClass("element");
    $("#symbol_preview_interactive" + suffix +" g").attr("element-id", "undefined")

    if($("#default_symbol_edge").val()==="Circle"){
      $("#symbol_preview"+suffix+" g.part-normal").html('<circle cx="15" cy="15" r="14" class="hoverstyle execstyle markstyle colorstyle stand"/>'+ $("#symbol_preview"+suffix+" g.part-normal").html());
      $("#symbol_preview_extra"+suffix+" g.part-normal").html('<circle cx="15" cy="15" r="14" class="hoverstyle execstyle markstyle colorstyle stand"/>'+ $("#symbol_preview"+suffix+" g.part-normal").html());
    }
    if($("#default_symbol_edge").val()==="Square"){
      $("#symbol_preview"+suffix+" g.part-normal").html('<rect x="1" y="1" width="28" height="28" rx="4" class="hoverstyle execstyle markstyle colorstyle stand"></rect>'+ $("#symbol_preview"+suffix+" g.part-normal").html());
      $("#symbol_preview_extra"+suffix+" g.part-normal").html('<rect x="1" y="1" width="28" height="28" rx="4" class="hoverstyle execstyle markstyle colorstyle stand"></rect>'+ $("#symbol_preview"+suffix+" g.part-normal").html());
    }
  }
}

