from py2neo import Graph, Node, Relationship
import json

# Connect to Neo4j database
graph = Graph("bolt://localhost:7687", auth=("neo4j", "ava25-DB!!"))

# Clear existing database (optional - be careful!)
# graph.delete_all()

with open('MC1_graph.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

node_dict = {}

# Create nodes first
for node in data['nodes']:
    node_type = node['Node Type']
    properties = {k: v for k, v in node.items() if k != 'Node Type'}
    node_obj = Node(node_type, **properties)
    graph.create(node_obj)
    node_dict[node['id']] = node_obj  # Store by JSON ID

# Create relationships using transaction
if 'links' in data:
    for link in data['links']:
        source_id = link['source']
        target_id = link['target']
        rel_type = link['Edge Type']
        
        # Get the actual node objects
        source_node = node_dict.get(source_id)
        target_node = node_dict.get(target_id)
        
        if source_node and target_node:
            # Create relationship using py2neo's Relationship
            relationship = Relationship(source_node, rel_type, target_node)
            graph.create(relationship)

print("Graph imported successfully. Nodes:", len(data['nodes']), "Relationships:", len(data.get('links', [])))