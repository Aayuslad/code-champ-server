export const templates = {
	python3: "def {function_name}({params}) -> {return_type}:\n    # Your code here",
	java: "public {return_type} {function_name}({params}) {\n    // Your code here\n}",
	cpp: "{return_type} {function_name}({params}) {\n    // Your code here\n}",
	c: "{return_type} {function_name}({params}) {\n    // Your code here\n}",
};

export const fulltemplates = {
	c: `
#include <stdio.h>

{function_code}

int main() {
    {input_processing};
    scanf("{input_format}", &{input_variables});
    int result = {function_name}({input_variables});
    printf("%d\\n", result);
    return 0;
}
`,

	cpp: `
#include <iostream>

{function_code}

int main() {
    {input_processing};
    std::cin >> {input_variables};
    int result = {function_name}({input_variables});
    std::cout << result << std::endl;
    return 0;
}
`,

	java: `
import java.util.Scanner;

public class Main {
    {function_code}

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        {input_processing}
        int result = {function_name}({input_variables});
        System.out.println(result);
        scanner.close();
    }
}
`,

	python3: `
{function_code}

if __name__ == "__main__":
    inputs = list(map(int, input().split()))
    result = {function_name}({input_variables})
    print(result)
`,
};
