ReactContentQuery.ExternalScripts.filtercode = {

    onPreRender: function(wpContext, handlebarsContext) {
        productObj = {};
        filters = [
            {
                name: "Business Unit",
                filterType: "BU",
                filterID: "BusinessUnit",
                field: "rawValue"
            },
            {
                name: "Country/Region",
                filterType: "CR",
                filterID: "Country_x0020__x002f__x0020_Region",
                field: "rawValue"
            },
            {
                name: "Annual Revenue",
                filterType: "RV",
                filterID: "Revenue",
                field: "rawValue"
            },
            {
                name: "Product Type",
                filterType: "PT",
                filterID: "ProductType",
                field: "rawValue"
            },
            {
                name: "Features",
                filterType: "FT",
                filterID: "Features",
                field: "rawValue"
            }/*,
            {
                name: "Point of Contact",
                filterType: "PC",
                filterID: "TestContact",
                field: "rawValue"
            }
            */
        ];


        handlebarsContext.registerHelper('productObjInit', function(products, options) {
            productObj = products; // Set entire product list object up for use later
           // console.log(JSON.stringify(products));

            for (p in productObj) {
                var textValue   = productObj[p]["TestContact"]["textValue"].replace(/\s\(.*\)/g, '');
                productObj[p]["TestContact"]["rawValue"] = textValue.split(";");

                var revenue = productObj[p]["Revenue"]["textValue"];
                if (revenue === "") {
                    productObj[p]["Revenue"]["LowerBoundary"] = -1;
                } else {
                    productObj[p]["Revenue"]["LowerBoundary"] = (parseInt(revenue.split("-")[0].replace("$","").replace("k","000").replace("M","000000"),10));
                }
            }

            console.log(JSON.stringify(productObj));
            // Create filters
            for (i in filters) {
                if(filters[i].filterID != "Revenue") {
                    var filterID = filters[i].filterID,
                        field = filters[i].field;
                    let filterset = [...new Set(products.map(item => item[filterID][field]))].filter(Boolean);
                    filters[i].list = [...new Set([].concat.apply([], filterset))].sort();
                } else {
                    filters[i].list = [
                        "$100M+",
                        "$50M-$100M",
                        "$10M-$50M",
                        "$5M-$10M",
                        "$1M-$5M",
                        "$500k-$1M",
                        "$100k-$500k",
                        "$0-$100k"   
                    ]
                }
            }
            console.log(filters);
            return options.fn(filters);
        });


    },
    
    onPostRender: function(wpContext, handlebarsContext) {
        console.log("v4");


        //$(document).ready(function(){
            var updatedObj = JSON.stringify(productObj, function(key, value) {
                return (value === undefined) ? [] : value
            });

            //console.log(updatedObj);
            productObj = JSON.parse(updatedObj);

            var curFilterType,
                setFilters;

            var afterFilter = function(result, jQ){
                if(localStorage.getItem("productshowcasesort")==='name') {
                    $('.sortorder')[1].checked=true
                } 

                $('#total_products').text(result.length);

                for (i in filters) {
                    var checkboxes = $("#"+filters[i].filterID+" :input");
                    var qResult = JsonQuery(result);
                    var qTotal = JsonQuery(productObj);
                    var otherTypesCheck = $('#filters fieldset:not("#'+ filters[i].filterID + '") :input:checked').closest("fieldset").length;

                    if(filters[i].filterID != curFilterType) {
                        checkboxes.each(function(){
                            var c = $(this);
                            var filterSet = filters[i].filterID + "." + filters[i].field; 
                            var count = (otherTypesCheck) ? qResult.where({ [filterSet]: c.val()}).count : qTotal.where({ [filterSet]: c.val()}).count
                            c.next().text(c.val() + ' (' + count + ')');
                            (count < 1) ? c.parent().hide() : c.parent().show()
                        });
                    }
                }
            }

            if(localStorage.getItem("productshowcasesort")!='name') {
                productObj.sort((a, b) => b.Revenue.LowerBoundary - a.Revenue.LowerBoundary); 
            } 

            var FJS = FilterJS(productObj, '#products', {
                template: '#product-template',
                search: {ele: '#searchbox'},
                filter_on_init: true,
                //search: {ele: '#searchbox', fields: ['runtime']}, // With specific fields
                callbacks: {
                    afterFilter: afterFilter
                }
            });

            var filterCriteriaObj = filters.map(function(elem) {
                return {
                    field: elem.filterID+"."+elem.field,
                    ele: '#'+elem.filterID+' input:checkbox'
                } 
            });
            FJS.addCriteria(filterCriteriaObj);

            window.FJS = FJS;

            function getParamByName(name){
                var value = []
                paramsArray = decodeURIComponent(window.location.search).split("?")[1].split("&")
                paramsArray.forEach(function(d){
                    if(d.indexOf(name) > -1){
                        value.push(d.split("=")[1])
                    }
                })
                return value;
            }

            var retrievedData = localStorage.getItem("productshowcase");
            var storedFilters = JSON.parse(retrievedData);

            if(decodeURIComponent(window.location.search)) {
                $.each(getParamByName('filter'), function(i, val){
                    $('#filters :input[value="' + val + '"]').first().prop('checked', true);
                });
            } else if (storedFilters) {
                $.each(storedFilters, function(i, val){
                    $('#filters :input[value="' + val + '"]').first().prop('checked', true);
                });            
            }


            FJS.filter();



            $("body").on( "click", ".sortorder", function(e) {
                if(e.target.value==='name') {
                    localStorage.setItem("productshowcasesort", "name");
                    FJS.records.sort(function(a, b) {
                        return (a['Title']['textValue'] > b['Title']['textValue']) ? 1 : ((a['Title']['textValue'] < b['Title']['textValue']) ? -1 : 0);
                    })
                } else {
                    localStorage.setItem("productshowcasesort", "revenue");
                    FJS.records.sort(function(a, b) {
                        return (b['Revenue']['LowerBoundary'] > a['Revenue']['LowerBoundary']) ? 1 : ((b['Revenue']['LowerBoundary'] < a['Revenue']['LowerBoundary']) ? -1 : 0);
                    })
                }
                FJS.setTemplate('#product-template',true);
            });

            $("#filters :input").click(function() {
                curFilterType = $(this).closest("fieldset").attr("id");

                var setFilters = $("fieldset input:checkbox:checked").map(function(){
                    return $(this).val();
                }).get(); // <----


                localStorage.setItem("productshowcase", JSON.stringify(setFilters));

                var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?' +decodeURIComponent($.param({ "filter": setFilters }));
                window.history.pushState({path:newurl},'',newurl);
            });
        //});
    }
}
