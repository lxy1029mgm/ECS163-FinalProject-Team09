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
        .map(item => ({
            [NTaxon_id_col]: item[NTaxon_id_col],
            [NLocation_col]: item[NLocation_col],
            [NCountry_code_col]: item[NCountry_code_col]
        }));

        //prepare countries list to link the name in map
        filtered_data.forEach(item => {
            const target = continent_data.find(d => d[map_config.NCountry_alpha_col] === item[NCountry_code_col]);
            item[NCountry_code_col] = target ? target[NCountry_code_col] : -1;
        });
        console.log("map_filtered_data", filtered_data);
        

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
            const target = processed_data.find(d => d["country_id"] === item[NCountry_code_col]);
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

            const margin = {top: 40, bottom: 50, left: 60, right: 140};

            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;

            const svg = d3.selectAll(rect_name).append("svg").attr("viewBox", [0, 0, width, height])
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
            

            // config projection
            const projection = d3.geoMercator()
            .fitSize([width, height], countries_data);

            const path = d3.geoPath().projection(projection);

            // config map
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
                const target = processed_data.find(cell => cell.country_id === d.id);
                const country_id = target ? target.country_id : null
                const country_target = continent_data.find(country => country[NCountry_code_col] === country_id)
                return `Country: ${country_target ? country_target["name"]: null}\nNum_Extinction: ${target ? target["num_extinct"] : null}`
            })

            // zoom
            const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on("zoom", (event) => {
                world_map.attr("transform", event.transform);
            });
    

            //config information
            map_base.append("text")
            .attr("transform", `translate(45, ${margin.top + innerHeight / 2}) rotate(-90)`)
            .attr("text-anchor", "middle")
            .attr("font-size", 15)
            .attr("fill", "Black")
            .text("Geological graph with extinction situation");

            // config Legend
            const legend = map_base.append("defs");

            const gradient = legend.append("linearGradient")
            .attr("id", "numExtinct")
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", 1)
            .attr("y2", 0);

            gradient.append("stop").attr("offset", "0%").attr("stop-color", "red");
            gradient.append("stop").attr("offset", "100%").attr("stop-color", "green");

            map_base.append("rect")
            .attr("fill", "url(#numExtinct)")
            .attr("width", 20)
            .attr("height", 60)
            .attr("transform", `translate(${width - margin.right + 4}, ${margin.top})`);

            // print description of legend
            map_base.append("text")
            .attr("x", width - margin.right + 30)
            .attr("y", 45)
            .attr("font-size", 9)
            .attr("fill", "green")
            .text("Low Extinction");

            map_base.append("text")
            .attr("x", width - margin.right + 30)
            .attr("y", 95)
            .attr("font-size", 9)
            .attr("fill", "red")
            .text("High Extinction");

            world_map.on("click", clicked);

            svg.call(zoom);

            function clicked(event, d){
                const bounds = path.bounds(d);
                const dx = bounds[1][0] - bounds[0][0];
                const dy = bounds[1][1] - bounds[0][1];
                const x = (bounds[0][0] + bounds[1][0]) / 2;
                const y = (bounds[0][1] + bounds[1][1]) / 2;

                const scale = 0.6 / Math.max(dx / width, dy / height);

                const tx = width / 2 - scale * x;
                const ty = height / 2 - scale * y;
                console.log("geoData", d)

                show_focused_country(d, scale, tx, ty);
            }

            function show_focused_country(geoData, scale, tx, ty){
                const overlay = svg.append("g").attr("class", "map-overlay").style("display", "none").on("click", hide_focused_country);
                overlay.selectAll("*").remove();
                overlay.style("display", "block");

                overlay.append("rect")
                .attr("width", width)
                .attr("height", height)
                .attr("fill", "rgba(0, 0, 0, 0.4)")

                const countryG = overlay.append("g")
                .attr("transform", `translate(${tx}, ${ty})scale(${scale})`);

                let target = null;
                countryG.append("path")
                .attr("d", path(geoData))
                .attr("fill", d => {
                    target = processed_data.find(item => +item["country_id"] === +geoData["id"]);
                    return target ? color(target["num_extinct"]) : "#FFFFFF";
                })
                .attr("stroke", "black")
                .attr("stroke-width", 0.1)
                .on("click", function(event) {
                    event.stopPropagation(); 
                });

                const num_extinct = target ? target["num_extinct"] : 0;

                // countryG.selectAll(".species-marker")
                // .data(random_points)
                // .enter()
                // .append("circle")
                // .attr("class", "species-marker")
                // .attr("cx", d => projection(d)[0])
                // .attr("cy", d => projection(d)[1])
                // .attr("r", 5 / scale)
                // .attr("fill", "black")
                // .attr("stroke", "black")
                // .attr("stroke-width", 1 / scale)
                // .on("click", (event, d) => {
                // event.stopPropagation();
                // });
            }

            function hide_focused_country() {
                d3.select(".map-overlay")
                  .style("display", "none");

                  svg.selectAll(".map-overlay").remove();
                }

            return svg.node();
        }
        
    });


}