import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import * as midi from './midi.js'

let kClusterBtn = document.getElementById('k-means-cluster');
let hiClusterBtn = document.getElementById('hier-cluster');
let resetBtn = document.getElementById('reset');
// set the dimensions and margins of the graph
const margin = { top: 10, right: 30, bottom: 30, left: 60 },
    width = 460 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

// append the svg object to the body of the page
const svg = d3.select("#my_dataviz")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
        `translate(${margin.left}, ${margin.top})`);

let byteRange = Math.round(10000 / 3);
init()
async function init() {
    midi.getPermission()
    await navigator.requestMIDIAccess().then((midiAccess) => {
        d3.csv("res/xyz_gaussian_clusters250129.csv", { headers: { "Range": `bytes = 0 - ${byteRange}` } }, d3.autoType).then(async function (rawData) {
            console.log(rawData)
            const hColorScale = d3.scaleLinear().domain([0, rawData.length]).range(d3.schemeCategory10);
            let data = rawData.map((d, i) => ({
                x: d[Object.keys(d)[1]],
                y: d[Object.keys(d)[2]],
                color: hColorScale(i)
            }));
            console.log(data)
            let xRange = [3, 2000];
            let yRange = [0, 2000];
            let psize = 5;
            // Add X axis
            const x = d3.scaleLinear()
                .domain(xRange)
                .range([0, width]);
            const xAxis = svg.append("g")
                .attr("transform", `translate(0, ${height})`)
                .call(d3.axisBottom(x));

            // Add Y axis
            const y = d3.scaleLinear()
                .domain(yRange)
                .range([height, 0]);
            const yAxis = svg.append("g")
                // .attr("transform", `translate(0, ${width})`)
                .call(d3.axisLeft(y));

            let k = 16;

            // Add dots
            svg.append('g')
                .selectAll("dot")
                .data(data)
                .join("circle")
                .attr("cx", d => x(d.x))
                .attr("cy", d => y(d.y))
                .attr("r", psize)
                .style("fill", "#69b3a2")

            function reset() {
                psize = 5;
                svg.selectAll("circle")
                    .attr('r', psize)
                    .style("fill", "#69b3a2")
                svg.selectAll('rect').remove()
            }
            //attached to input element
            function updateXRange(value = [0, 0]) {
                // Get the value of the button
                if (value.length !== 2) {
                    return "Array must have exactly two elements.";
                }

                const [vx, vy] = value;
                const [r1, r2] = xRange;

                xRange = [vx + r1, vy + r2];

                // Update X axis
                x.domain(xRange)
                // xAxis.transition().duration(1000).call(d3.axisBottom(x))
                xAxis.call(d3.axisBottom(x))

                // Update chart
                svg.selectAll("circle")
                    .data(data)
                    // .transition()
                    // .duration(0)
                    .attr("cx", d => x(d.x))
                    .attr("cy", d => y(d.y))
            }

            //attached to input element
            function updateYRange(value = [0, 0]) {
                // Get the value of the button
                if (value.length !== 2) {
                    return "Array must have exactly two elements.";
                }

                const [vx, vy] = value;
                const [r1, r2] = yRange;

                yRange = [vx + r1, vy + r2];

                // Update Y axis
                y.domain(yRange)
                // yAxis.transition().duration(1000).call(d3.axisLeft(y))
                yAxis.call(d3.axisLeft(y))
                // Update chart
                svg.selectAll("circle")
                    .data(data)
                    // .transition()
                    // .duration(0)
                    .attr("cx", d => x(d.x))
                    .attr("cy", d => y(d.y))
            }

            function updatePointSize(value = 1) {
                // Get the value of the button
                psize += value

                // Update chart
                svg.selectAll("circle")
                    .data(data)
                    // .transition()
                    // .duration(0)
                    .attr("r", psize)
            }

            function drawkMeans(data, assignments = [], centroids = []) {
                svg.selectAll("circle").remove();
                svg.selectAll("rect").remove();

                let color = d3.scaleOrdinal(d3.schemeCategory10);

                // Plot data points
                svg.selectAll("circle")
                    .data(data)
                    .enter()
                    .append("circle")
                    .attr("cx", d => x(d.x))
                    .attr("cy", d => y(d.y))
                    .attr("r", psize)
                    .style("fill", (d, i) => assignments.length ? color(assignments[i]) : "#69b3a2");

                // Plot centroids
                svg.selectAll("rect")
                    .data(centroids)
                    .enter()
                    .append("rect")
                    .attr("x", d => x(d.x) - 5)
                    .attr("y", d => y(d.y) - 5)
                    .attr("width", 10)
                    .attr("height", 10)
                    .attr("fill", "black");
            }

            function kMeansClustering(data, k, maxIterations = 100) {
                console.log('here')
                console.log(data)
                console.log(k)
                let centroids = data.slice(0).sort(() => Math.random() - 0.5).slice(0, k);
                let assignments = new Array(data.length);
                let converged = false;
                let iterations = 0;

                while (!converged && iterations < maxIterations) {
                    converged = true;

                    // Assign points to nearest centroid
                    for (let i = 0; i < data.length; i++) {
                        let minDist = Infinity, clusterIndex = -1;
                        for (let j = 0; j < k; j++) {
                            let dist = Math.hypot(data[i].x - centroids[j].x, data[i].y - centroids[j].y);
                            if (dist < minDist) {
                                minDist = dist;
                                clusterIndex = j;
                            }
                        }
                        if (assignments[i] !== clusterIndex) {
                            assignments[i] = clusterIndex;
                            converged = false;
                        }
                    }

                    // Compute new centroids
                    let newCentroids = Array.from({ length: k }, () => ({ x: 0, y: 0, count: 0 }));
                    console.log(newCentroids)
                    for (let i = 0; i < data.length; i++) {
                        let clusterIndex = assignments[i];
                        newCentroids[clusterIndex].x += data[i].x;
                        newCentroids[clusterIndex].y += data[i].y;
                        newCentroids[clusterIndex].count++;
                    }
                    for (let j = 0; j < k; j++) {
                        if (newCentroids[j].count > 0) {
                            centroids[j] = {
                                x: newCentroids[j].x / newCentroids[j].count,
                                y: newCentroids[j].y / newCentroids[j].count
                            };
                        }
                    }

                    iterations++;
                }
                return { centroids, assignments };
            }

            resetBtn.addEventListener('click', reset)

            kClusterBtn.addEventListener('click', () => {
                let { centroids, assignments } = kMeansClustering(data, k);
                drawkMeans(data, assignments, centroids);
            });

            hiClusterBtn.addEventListener('click', function () {

                // Compute hierarchical clustering using Euclidean distance
                function euclideanDist(a, b) {
                    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
                }
                //mix 2 rgb string colors
                function mixColors(c1, c2) {
                    // Function to extract RGB values from a string
                    function extractRGB(color) {
                        const match = color.match(/\d+/g).map(Number);
                        return { r: match[0], g: match[1], b: match[2] };
                    }

                    const color1 = extractRGB(c1);
                    const color2 = extractRGB(c2);

                    // Compute the average of each color channel and round
                    const mixedColor = {
                        r: Math.round((color1.r + color2.r) / 2),
                        g: Math.round((color1.g + color2.g) / 2),
                        b: Math.round((color1.b + color2.b) / 2)
                    };

                    return `rgb(${mixedColor.r}, ${mixedColor.g}, ${mixedColor.b})`;
                }
                // keep this!!..
                function hierarchicalClustering(data) {
                    function euclideanDist(a, b) {
                        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
                    }

                    // Initialize clusters
                    let clusters = data.map((d, i) => ({ id: i, x: d.x, y: d.y, color: d.color, children: [] }));

                    while (clusters.length > 1) {
                        let minDist = Infinity;
                        let mergeA = -1, mergeB = -1;

                        // Find the two closest clusters
                        for (let i = 0; i < clusters.length; i++) {
                            for (let j = i + 1; j < clusters.length; j++) {
                                let dist = euclideanDist(clusters[i], clusters[j]);
                                if (dist < minDist) {
                                    minDist = dist;
                                    mergeA = i;
                                    mergeB = j;
                                }
                            }
                        }

                        // Ensure valid merge indices
                        if (mergeA === -1 || mergeB === -1) break;

                        // Create a new merged cluster (centroid-based)
                        let newCluster = {
                            id: `cluster-${clusters.length}`,
                            x: (clusters[mergeA].x + clusters[mergeB].x) / 2,
                            y: (clusters[mergeA].y + clusters[mergeB].y) / 2,
                            color: mixColors(clusters[mergeA].color, clusters[mergeA].color),
                            children: [clusters[mergeA], clusters[mergeB]]
                        };

                        // Remove merged clusters and add the new cluster
                        clusters.splice(mergeB, 1);
                        clusters.splice(mergeA, 1);
                        clusters.push(newCluster);
                        console.log(clusters)
                    }

                    return clusters[0]; // Root of hierarchy
                }


                // Step 6: Render Dendrogram in D3.js
                let root = hierarchicalClustering(data);

                if (!root) {
                    console.error("Failed to compute hierarchical clustering.");
                    return;
                }

                let hierarchyRoot = d3.hierarchy(root);
                let cluster = d3.cluster().size([1000, 1000]); // Define cluster layout
                cluster(hierarchyRoot);

                console.log(hierarchyRoot)

                // Clear previous visualization
                d3.select('#dendrogram').selectAll().remove();

                // Create SVG container
                let svg = d3.select('#dendrogram')
                    .append('svg')
                    .attr('width', 10000)
                    .attr('height', 10000)
                    .append('g')
                    .attr('transform', 'translate(50,50)');

                // Render links (connecting lines)
                svg.selectAll('.link')
                    .data(hierarchyRoot.links())
                    .enter()
                    .append('path')
                    .attr('class', 'link')
                    .attr('d', d3.linkVertical()
                        .x(d => d.x)
                        .y(d => d.y))
                    .style('fill', 'none')
                    .style('stroke', '#555');

                // Render data points in data viz
                d3.select("#my_dataviz").selectAll('circle').style("fill", (d, i) => d.color)
                // Render nodes (clusters and points)
                let node = svg.selectAll('.node')
                    .data(hierarchyRoot.descendants())
                    .enter()
                    .append('g')
                    .attr('class', 'node')
                    .attr('transform', d => `translate(${d.x},${d.y})`);

                node.each(function (d) {
                    let clusterGroup = d3.select(this);
                    let allLeaves = d.leaves(); // Get all leaf nodes in this subtree
                    console.log(`d:`)
                    console.log(d)
                    if (d.children) {
                        // Parent Node: Draw all child circles inside
                        allLeaves.forEach((leaf, i) => {
                            console.log(`Leaf:`)
                            console.log(leaf)
                            clusterGroup.append('circle')
                                .attr('r', 5)
                                .attr('cx', i * 8 - (allLeaves.length * 4)) // Spread out within cluster
                                .style('fill', leaf.data.color);
                        });
                    } else {
                        // Leaf Node: Draw a single circle
                        clusterGroup.append('circle')
                            .attr('r', 5)
                            .style('fill', d.data.color);
                    }
                });

                // Add text labels
                node.append('text')
                    .attr('dy', -10)
                    .attr('text-anchor', 'middle')
                    .text(d => d.id);
            });


            //MIDI Input Mapping
            console.log(midiAccess)
            midi.listInputsAndOutputs(midiAccess);
            let delta = 1;
            midi.startLoggingMIDIInput(midiAccess, (event) => {
                console.log(event.data)
                // TODO: Use Hashmap for all control bindings.
                if (event.data[0] === 0xb0) {
                    //turn knobs

                    if (event.data[1] == 0x10) {
                        //x-min
                        if (event.data[2] === 0x41) {
                            //scrolling counter-clockwise
                            updateXRange([-delta, 0]);
                        } else if (event.data[2] === 0x1) {
                            //scrolling clockwise
                            updateXRange([delta, 0]);
                        }

                    }
                    else if (event.data[1] == 0x11) {
                        //x-max
                        if (event.data[2] === 0x41) {
                            //scrolling counter-clockwise
                            updateXRange([0, -delta]);
                        } else if (event.data[2] === 0x1) {
                            //scrolling clockwise
                            updateXRange([0, delta]);
                        }
                    }

                    else if (event.data[1] == 0x12) {
                        //y-min
                        if (event.data[2] === 0x41) {
                            //scrolling counter-clockwise
                            updateYRange([-delta, 0]);
                        } else if (event.data[2] === 0x1) {
                            //scrolling clockwise
                            updateYRange([delta, 0]);
                        }
                    }
                    else if (event.data[1] == 0x13) {
                        //y-max
                        if (event.data[2] === 0x41) {
                            //scrolling counter-clockwise
                            updateYRange([0, -delta]);
                        } else if (event.data[2] === 0x1) {
                            //scrolling clockwise
                            updateYRange([0, delta]);
                        }
                    }
                    else if (event.data[1] == 0x14) {
                        //size of dots
                        if (event.data[2] === 0x41) {
                            //scrolling counter-clockwise
                            updatePointSize(-1);
                        } else if (event.data[2] === 0x1) {
                            //scrolling clockwise
                            updatePointSize(1);
                        }
                    }
                }
                else if (event.data[0] === 0xe7 && event.data[1] === 0x0) {
                    delta = event.data[2];
                }
                else if (event.data[0] === 0xe0 && event.data[1] === 0x0) {
                    k = Math.floor(event.data[2] / 3);
                }
            })


        });
    })

}