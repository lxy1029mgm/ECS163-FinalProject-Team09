// Claim d3 and d3-sankey for intellisense (error checking & prompt)
/**@typedef {import('d3')} */
/**
 * @typedef {import('topojson')}
 * @typedef {import('echarts')}
 */



//import config, easy to manage and modified if needed, makes file organized
import { map_config } from '../config/map_config.js';
import { global_config } from '../config/global_config.js';


//export function for other js to import, also for modular
export function draw_map(is_resize, filter_mode, view_mode){
    // if page refresh, reset sidebar location
    const appElement = document.getElementById('app');
    if (appElement && appElement.__vue_app__) {
        appElement.__vue_app__._instance.proxy.close_side_bar();
    }
                    
    d3.csv(global_config.data_path).then(async raw_data => {
        if(is_resize){
            draw_graph();
            return;
        }
        const continent_data = await d3.csv(global_config.continent_path);
        console.log("map_raw_data", raw_data);
        console.log("filter_mode", filter_mode);

        const filtered_mode_set = new Set();
        filter_mode.forEach(item => filtered_mode_set.add(item));
        //Non user modified settings/ variables
        const NTaxon_id_col = map_config.NTaxon_id_col;
        const NLocation_col = map_config.NLocation_col;
        const NCountry_code_col = map_config.NCountry_code_col;
        const NClass_name_col = global_config.NClass_name_col;

        //data processing
        const filtered_data = raw_data
        .filter(item => filtered_mode_set.has(item[NClass_name_col]))
        // .map(item => ({
        //     [NTaxon_id_col]: item[NTaxon_id_col],
        //     [NLocation_col]: item[NLocation_col],
        //     [NCountry_code_col]: item[NCountry_code_col]
        // }));

        //prepare countries list to link the name in map
        filtered_data.forEach(item => {
            const target = continent_data.find(d => d[map_config.NCountry_alpha_col] === item[NCountry_code_col]);
            item[NCountry_code_col] = target ? target[NCountry_code_col] : -1;
        });
        console.log("map_filtered_data", filtered_data);
        
        // import map data
        const map_url = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
        const world_data = await d3.json(map_url);
        console.log("world_data", world_data);
        const countries_data = topojson.feature(world_data, world_data.objects.countries);

        console.log("continent data", continent_data);
        console.log("countries data", countries_data);

        //processing countries to land
        const continent_list = new Set();
        const countries_to_land = [];
        continent_data.forEach(item => {
            const region_code = item[map_config.NRegion_code_col];
            if(!continent_list.has(region_code) && region_code != ""){
                countries_to_land.push({
                    "region-code": region_code,
                    "country-set": new Set(),
                    "region-name": item[map_config.NRegion_name_col],
                    "num_extinct": 0
                });
                continent_list.add(region_code);
            }
            const target = countries_to_land.find(region => region["region-code"] === region_code);
            target ? target["country-set"].add(item[map_config.NCountry_code_col]) : null;
        });

        console.log("countries in region", countries_to_land)

        // count values for the map
        let processed_data = [];
        const processed_class = new Set();
        let max_extinct = 0;
        let land_max_extinct = 0;
        filtered_data.forEach(item => {
            if(!processed_class.has(item[NCountry_code_col])){
                processed_data.push({
                    "country_id": item[NCountry_code_col],
                    "num_extinct": 0
                });
                processed_class.add(item[NCountry_code_col]);
            }
            const target = processed_data.find(d => +d["country_id"] === +item[NCountry_code_col]);
            target["num_extinct"] ++;
            if(target["num_extinct"] > max_extinct){
                max_extinct = target["num_extinct"];
            }
            countries_to_land.forEach(land => {
                if(land["country-set"].has(item[NCountry_code_col])){
                    land["num_extinct"] ++;
                    if(land["num_extinct"] > land_max_extinct){
                        land_max_extinct = land["num_extinct"];
                    }
                }
            });
        });

        // if its region view, reprocess the data in region
        if(!view_mode){
            processed_data = [];
            countries_to_land.forEach(land => {
                land["country-set"].forEach(country => {
                    processed_data.push({
                        "country_id": country,
                        "num_extinct": land["num_extinct"]
                    });
                });
            });
            max_extinct = land_max_extinct;
        }
        console.log("processed_data", processed_data);

        let min_extinct = 99999;
        processed_data.forEach(item => {
            min_extinct = item["num_extinct"] < min_extinct ? item["num_extinct"] : min_extinct;
        });

        draw_graph();

        function draw_graph(){
            const rect_name = map_config.class_name;
            d3.selectAll(rect_name).selectAll("*").remove();

            const rect = document.querySelector(rect_name).getBoundingClientRect();

            const width = rect.width; //should dynamically adjust after html is implemented
            const height = rect.height;
            const dynamic_scale = Math.min(width, height) * 0.40;

            const margin = {top: 40, bottom: 50, left: 60, right: 140};

            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;

            const svg = d3.selectAll(rect_name).append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("preserveAspectRatio", "xMidYMid meet");
            const map_base = svg.append("g").attr("class", "map-base");


            // config color
            let color = null
            if(view_mode){
                color = d3.scaleSymlog()
                .domain([0, max_extinct])
                .range(["#2cba00", "#a30000"]);
            }
            else{
                color = d3.scaleSequential(d3.interpolateRgb("#2cba00", "#a30000")).domain([min_extinct, max_extinct]);
            }

            // drag action
            const drag = d3.drag()
            .on("start", function(e){
                if (e.sourceEvent) {
                    e.sourceEvent.stopPropagation();
                    e.sourceEvent.preventDefault();
                }
                svg.interrupt();
                
            })
            .on("drag", function(e){
                if (e.sourceEvent) {
                    e.sourceEvent.stopPropagation();
                    e.sourceEvent.preventDefault();
                }
                console.log("Dragging:", e.x);
                const sensitive_k = 0.25;
                const ang_start = projection.rotate();
                const lambda = ang_start[0] + e.dx * sensitive_k;
                const phi = ang_start[1] - e.dy * sensitive_k;
                projection.rotate([lambda, Math.max(-90, Math.min(90, phi))]);
                svg.selectAll("path").attr("d", path);
            });
            

            // config projection
            const projection = d3.geoOrthographic()
            .scale(dynamic_scale)
            .translate([width / 2, height / 2])
            .clipAngle(90);

            const path = d3.geoPath().projection(projection);

            const background = map_base.append("circle")
            .attr("cx", width / 2)
            .attr("cy", height / 2)
            .attr("r", projection.scale())
            .attr("fill", "#0d1b2a")
            .call(drag);

            // draw map
            const world_map = map_base.selectAll("path")
            .data(countries_data.features)
            .join("path")
            .attr("class", "world_map")
            .attr("d", path)
            .attr("stroke", "black")
            .attr("stroke-width", 0.1)
            .attr("fill", d => {
                const value = processed_data.find(cell => +cell.country_id === +d.id);
                return value ? color(value["num_extinct"]) : "#FFFFFF";
            });

            world_map.append("title")
            .text(d => {
                const target = processed_data.find(cell => +cell.country_id === +d.id);
                const country_id = target ? target.country_id : null
                const country_target = continent_data.find(country => +country[NCountry_code_col] === +country_id)
                return `Country: ${country_target ? country_target["name"]: null}\nNum_Extinction: ${target ? target["num_extinct"] : null}`
            })

            // zoom
            const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .filter(event => {
                return event.type === 'wheel' || event.ctrlKey; 
            })
            .on("zoom", (event) => {
                map_base.attr("transform", event.transform);
            });
    

            //config information
            svg.append("text")
            .attr("transform", `translate(45, ${margin.top + innerHeight / 2}) rotate(-90)`)
            .attr("text-anchor", "middle")
            .attr("font-size", 15)
            .attr("fill", "White")
            .text("Geological graph with extinction situation");

            // config Legend
            const legend = svg.append("defs");

            const gradient = legend.append("linearGradient")
            .attr("id", "numExtinct")
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", 1)
            .attr("y2", 0);

            gradient.append("stop").attr("offset", "0%").attr("stop-color", "red");
            gradient.append("stop").attr("offset", "100%").attr("stop-color", "green");

            svg.append("rect")
            .attr("fill", "url(#numExtinct)")
            .attr("width", 20)
            .attr("height", 60)
            .attr("transform", `translate(${width - margin.right + 4}, ${margin.top})`);

            // print description of legend
            svg.append("text")
            .attr("x", width - margin.right + 30)
            .attr("y", 45)
            .attr("font-size", 9)
            .attr("fill", "green")
            .text("Low Extinction");

            svg.append("text")
            .attr("x", width - margin.right + 30)
            .attr("y", 95)
            .attr("font-size", 9)
            .attr("fill", "red")
            .text("High Extinction");

            world_map.on("click", clicked).call(drag);

            svg.call(zoom);

            function clicked(event, d){
                if (event.defaultPrevented) return;
                svg.call(zoom.transform, d3.zoomIdentity);
                const center = d3.geoCentroid(d);
                const rotation = [-center[0], -center[1]];
                const new_scale = Math.min(width, height) * 1;
                background.transition()
                .duration(1000)
                .attr("r", new_scale);

                d3.transition()
                .duration(1000)
                .tween("rotate", () => {
                    const r = d3.interpolate(projection.rotate(), rotation);
                    const s = d3.interpolate(projection.scale(), new_scale);
                    return function(t) {
                        projection.rotate(r(t)).scale(s(t));
                        svg.selectAll("path").attr("d", path); 
                    };
                })
                .on("end", () => {
                    show_focused_country(d);
                })
                
            }

            function show_focused_country(geoData){
                const overlay = svg.append("g").attr("class", "overlay-group").style("display", "none").on("click", hide_focused_country);
                overlay.selectAll("*").remove();
                overlay.style("display", "block");

                overlay.append("rect")
                .attr("width", width)
                .attr("height", height)
                .attr("fill", "rgba(0, 0, 0, 0.4)")

                const countryG = overlay.append("g")

                let target = null;
                let country_id = null;
                countryG.append("path")
                .attr("d", path(geoData))
                .attr("fill", d => {
                    target = processed_data.find(item => +item["country_id"] === +geoData["id"]);
                    country_id = target ? target["country_id"] : -1;
                    return target ? color(target["num_extinct"]) : "#FFFFFF";
                })
                .attr("stroke", "black")
                .attr("stroke-width", 0.1)
                .on("click", function(event) {
                    event.stopPropagation(); 
                })
                    
                if(country_id > -1){
                    draw_force_directed(geoData);
                }
                
            }

            function hide_focused_country() {
                d3.select(".map-overlay")
                  .style("display", "none");

                  svg.selectAll(".overlay-group").remove();

                  if (appElement && appElement.__vue_app__) {
                    appElement.__vue_app__._instance.proxy.close_side_bar();
                }
                

                const original_scale = Math.min(width, height) * 0.40;

                d3.transition()
                .duration(1000)
                .tween("reset-earth", () => {
                    const s = d3.interpolate(projection.scale(), original_scale);
                    return function(t) {
                        projection.scale(s(t));
                        svg.selectAll("path").attr("d", path); 
                        background.attr("r", s(t));
                    };
                })
            }

            function draw_force_directed(geoData){
                const center = d3.geoCentroid(geoData);
                const [center_x, center_y] = projection(center);

                const filtered_data_in_country = filtered_data.filter(item => +item[NCountry_code_col] === +geoData["id"]);
                console.log("force_direct_filtered_data", geoData);

                const nodes = filtered_data_in_country.map(d => ({
                    ...d,
                    x: center_x,
                    y: center_y
                }));

                const overlay = d3.select(".overlay-group");
                const overlay_graph = overlay.append("g").attr("id", "forced-directed-group");

                const links = overlay_graph.selectAll(".data-link")
                .data(nodes)
                .enter()
                .append("line")
                .attr("stroke", "rgba(255,255,255,0.4)")
                .attr("stroke-width", 1);

                const bubbles = overlay_graph.selectAll(".data-points")
                .data(nodes)
                .enter()
                .append("circle")
                .attr("r", 15)
                .attr("fill", color(filtered_data_in_country.length))
                .attr("stroke", "black")
                .attr("stroke-width", 1)
                .on("click", function(event, d) {
                    event.stopPropagation();
                    show_sidebar(d, geoData["properties"]["name"])
                });

                const force_directed_graph = d3.forceSimulation(nodes)
                .force("collide", d3.forceCollide(17))
                .force("x", d3.forceX(center_x).strength(0.06))
                .force("y", d3.forceY(center_y).strength(0.06))
                .force("charge", d3.forceManyBody().strength(-30));

                force_directed_graph.on("tick", () => {
                    bubbles.attr("cx", d => d.x)
                    .attr("cy", d => d.y);

                    links.attr("x1", center_x)
                    .attr("y1", center_y)
                    .attr("x2", d => d.x)
                    .attr("y2", d => d.y);
                })

                if (filtered_data_in_country.length == 0){
                    return;
                }

            }

            function show_sidebar(data, country_name){
                console.log("sidebar_data", data);
                document.getElementById("sb-name").innerText = data["scientific_name"] || "Unknown species";
                document.getElementById("sb-id").innerText = data["taxonid"] || "Unknown id";
                document.getElementById("sb-year").innerText = data["yearLastSeen" || "Unknown last seen"];
                document.getElementById("sb-country").innerText = country_name || "Unknown country";
                document.getElementById("sb-category").innerText = data["class_name"] || "Unknown category";
                document.getElementById("sb-threaten").innerText = data["threats"] || "Unknown reason";

                if (appElement && appElement.__vue_app__) {
                    appElement.__vue_app__._instance.proxy.open_side_bar();
                }
            }

            return svg.node();
        }
        
    });


}