export const derivedTypes = {
	String: {
		python3: "str",
		java: "String",
		cpp: "string",
		c: "char*",
	},
	Array: {
		python3: "List[base_type]",
		java: "base_type[]",
		cpp: "vector<base_type>",
		c: "base_type*",
	},
	LinkedList: {
		python3: "collections.deque[base_type]", // python3’s deque can be used as a linked list
		java: "LinkedList<base_type>",
		cpp: "list<base_type>", // list in C++ is a doubly-linked list
		c: "struct Node*", // Linked list in C is typically implemented using a struct
	},
	Set: {
		python3: "Set[base_type]", // python3’s set is unordered
		java: "HashSet<base_type>", // HashSet is unordered, TreeSet is ordered
		cpp: "set<base_type>", // set is ordered; use unordered_set for unordered
		c: "struct Set*", // Custom implementation is typically needed in C
	},
	Map: {
		python3: "Dict[key_type, value_type]", // python3’s dict
		java: "HashMap<key_type, value_type>", // HashMap is unordered, TreeMap is ordered
		cpp: "unordered_map<key_type, value_type>", // unordered_map is common; use map for ordered
		c: "struct Map*", // Custom implementation is typically needed in C
	},
	Queue: {
		python3: "collections.deque[base_type]", // deque can be used as a queue
		java: "Queue<base_type>", // Queue is an interface; often implemented by LinkedList
		cpp: "queue<base_type>", // Standard queue in C++
		c: "struct Queue*", // Custom implementation is typically needed in C
	},
	Stack: {
		python3: "List[base_type]", // python3’s list can be used as a stack (LIFO)
		java: "Stack<base_type>", // Stack class is available in Java
		cpp: "stack<base_type>", // Standard stack in C++
		c: "struct Stack*", // Custom implementation is typically needed in C
	},
	TreeNode: {
		python3: "TreeNode", // Typically custom-defined in python3
		java: "TreeNode<base_type>", // Custom tree node class in Java
		cpp: "TreeNode<base_type>", // Custom tree node class in C++
		c: "struct TreeNode*", // Custom struct in C
	},
	GraphNode: {
		python3: "GraphNode", // Typically custom-defined in python3
		java: "GraphNode<base_type>", // Custom graph node class in Java
		cpp: "GraphNode<base_type>", // Custom graph node class in C++
		c: "struct GraphNode*", // Custom struct in C
	},
};
