export const typeModifiers = {
    unsigned: {
        python3: "",
        java: "",
        cpp: "unsigned",
        c: "unsigned",
    },
    short: {
        python3: "",
        java: "short", // just "short" no "short int"
        cpp: "short",
        c: "short",
    },
    long: {
        python3: "",
        java: "long", // just "long" no "long int"
        cpp: "long",
        c: "long",
    },
    longLong: { 
        python3: "",
        java: "BigInteger", // just "BigInteger" no "BigInteger int"
        cpp: "long long",
        c: "long long",
    },
    const: {
        python3: "",
        java: "final", // "final int" no "final"
        cpp: "const",
        c: "const",
    },
    volatile: {
        python3: "",
        java: "",
        cpp: "volatile",
        c: "volatile",
    },
};

export const cFormatSpecifiers: { [key: string]: string } = {
    int: "%d",
    "unsigned int": "%u",
    float: "%f",
    double: "%lf",
    char: "%c",
    pointer: "%p",
    "long int": "%ld",
    "short int": "%hd",
    "long long int": "%lld",
    "unsigned long int": "%lu",
    "unsigned long long int": "%llu",
    "long double": "%Lf",
    "unsigned short int": "%hu",
    "unsigned int (hexadecimal)": "%x",
    "unsigned int (octal)": "%o",
    "string (char array)": "%s",
    "scientific notation (float)": "%e",
    "float (automatic selection)": "%g",
    "int (similar to %d)": "%i",
    "integer (stores number of characters printed)": "%n",
    "short int (hexadecimal)": "%hx",
    "short int (octal)": "%ho",
};
// int: %d
// unsigned int: %u
// short int: %hd
// unsigned short int: %hu
// long int: %ld
// unsigned long int: %lu
// long long int: %lld
// unsigned long long int: %llu