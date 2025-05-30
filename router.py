import random
from fastapi import APIRouter
from fastapi.responses import HTMLResponse, JSONResponse
from neo4j import GraphDatabase
import os
import time

# Credentials
NEO4J_URI = "bolt://" + os.environ.get('DB_HOST') + ":7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = os.environ.get('DB_PASSWORD')

router = APIRouter()

# Example data
sample_people = [
    {"name": "Alice"},
    {"name": "Bob"},
    {"name": "Charlie"}
]

relationships = [
    ("Alice", "Bob", "KNOWS"),
    ("Alice", "Charlie", "FRIENDS_WITH")
]


@router.get("/", response_class=HTMLResponse, tags=["ROOT"])
async def root():
    html_content = """
        <html>
            <head>
                <title>AVA Template Python API</title>
            </head>
            <body>
                <h1>AVA Template Python API</h1>
            </body>
        </html>
        """
    return HTMLResponse(content=html_content, status_code=200)

# Just used for debugging
@router.get("/clear-db", response_class=JSONResponse)
async def clear_db():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")
        print("Database cleared.")
        
    
    return {"success": True}

@router.get("/read-db-example", response_class=JSONResponse)
async def read_db_example():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

    with driver.session() as session:
        # Pull airport info
        node_result = session.run("""
            MATCH (a:Airport) 
            RETURN a.iata AS code, a.city AS city, a.descr AS name, a.runways AS runways
        """)

        # Pull flight connections
        edge_result = session.run("""
            MATCH (a:Airport)-[r:FLIGHT]->(b:Airport)
            RETURN a.iata AS from, b.iata AS to, r.dist AS dist
        """)

        if node_result.peek() is None and edge_result.peek() is None:
            return {"success": False, "error-message": "The database is empty!"}

        dbContentArray = ["Airports in the database:"]
        for record in node_result:
            dbContentArray.append(
                f" - {record['code']} ({record['city']}): {record['name']} with {record['runways']} runways"
            )

        dbContentArray.append(" ")
        dbContentArray.append("Flight connections:")
        for record in edge_result:
            dbContentArray.append(
                f" - {record['from']} -> {record['to']} ({record['dist']} miles)"
            )

    time.sleep(1)
    return {"success": True, "db-content": dbContentArray}
    
@router.get("/write-db-example", response_class=JSONResponse)
async def write_db_example():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")
        print("Database cleared.")

        # Load airports (nodes)
        session.run("""
            LOAD CSV WITH HEADERS FROM 'file:///nodes.csv' AS row
            CREATE (:Airport {
                id: toInteger(row.id),
                iata: row.iata,
                icao: row.icao,
                city: row.city,
                descr: row.descr,
                region: row.region,
                runways: toInteger(row.runways),
                longest: toInteger(row.longest),
                altitude: toInteger(row.altitude),
                country: row.country,
                continent: row.continent,
                lat: toFloat(row.lat),
                lon: toFloat(row.lon)
            })
        """)

        # Load flight connections (edges)
        session.run("""
            LOAD CSV WITH HEADERS FROM 'file:///edges.csv' AS row
            MATCH (a:Airport {iata: row.src}), (b:Airport {iata: row.dest})
            CREATE (a)-[:FLIGHT {dist: toInteger(row.dist)}]->(b)
        """)

    time.sleep(1)
    return {"success": True, "message": "Airport data imported from CSV files."}

#Passing in the graph data to the frontend
@router.get("/graph-data", response_class=JSONResponse)
async def get_graph_data():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    with driver.session() as session:
        # Get nodes
        nodes_result = session.run("""
            MATCH (a:Airport)
            RETURN a.iata     as id,
                   a.city     as city,
                   a.country  as country,
                   a.continent as continent,
                   a.latitude  as lat,
                   a.longitude as lon,
                   a.altitude  as altitude
        """)
        
        nodes = [dict(record) for record in nodes_result]
        
        # Get edges
        edges_result = session.run("""
            MATCH (a:Airport)-[r:FLIGHT]->(b:Airport)
            RETURN a.iata as source,
                   b.iata as target,
                   r.distance as distance
        """)
        
        edges = [dict(record) for record in edges_result]
        
        if not nodes and not edges:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "No data found"}
            )
    
    return {
        "success": True,
        "nodes": nodes,
        "edges": edges
    }

# Get airports with 7 runways
@router.get("/seven-runways", response_class=JSONResponse)
async def get_seven_runways():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    with driver.session() as session:
        result = session.run("""
            MATCH (a:Airport)
            WHERE a.runways = 7
            RETURN a.iata as id
        """)
        
        airports = [record["id"] for record in result]
        
    return {
        "success": True,
        "airports": airports
    }

@router.get("/search-node/{search_term}", response_class=JSONResponse)
async def search_node(search_term: str):
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    with driver.session() as session:
        # Query for the node and its immediate neighbors
        result = session.run("""
            MATCH (n)
            WHERE n.name =~ $search_term OR n.id = toString($search_term)
            WITH n
            OPTIONAL MATCH (n)-[r]-(neighbor)
            RETURN 
                collect(DISTINCT {
                    id: toString(n.id),
                    name: n.name,
                    type: labels(n)[0],
                    properties: properties(n)
                })[0] as main_node,
                collect(DISTINCT {
                    id: toString(neighbor.id),
                    name: neighbor.name,
                    type: labels(neighbor)[0],
                    properties: properties(neighbor)
                }) as neighbors,
                collect(DISTINCT {
                    source: toString(startNode(r).id),
                    target: toString(endNode(r).id),
                    type: type(r)
                }) as relationships
        """, {"search_term": "(?i).*" + search_term + ".*"})
        
        data = result.single()
        if not data or not data["main_node"]:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "Node not found"}
            )
            
        # Combine main node with neighbors for nodes list
        nodes = [data["main_node"]] + [n for n in data["neighbors"] if n]
        edges = [r for r in data["relationships"] if r]
        
        return {
            "success": True,
            "data": {
                "nodes": nodes,
                "edges": edges
            }
        }

