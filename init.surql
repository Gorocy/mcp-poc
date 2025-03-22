USE NAMESPACE mcp;
USE DATABASE knowledge;

DEFINE TABLE knowledge SCHEMAFULL;
DEFINE FIELD topic ON TABLE knowledge TYPE string;
DEFINE FIELD content ON TABLE knowledge TYPE string;
DEFINE INDEX topic_idx ON TABLE knowledge COLUMNS topic UNIQUE;

CREATE knowledge CONTENT {
  topic: "programowanie",
  content: "Programowanie to proces tworzenia programów komputerowych, które wykonują określone zadania."
};

CREATE knowledge CONTENT {
  topic: "javascript",
  content: "JavaScript to język programowania wykorzystywany głównie do tworzenia interaktywnych stron internetowych."
};

CREATE knowledge CONTENT {
  topic: "typescript",
  content: "TypeScript to nadzbiór JavaScript, który dodaje statyczne typowanie do języka."
};

CREATE knowledge CONTENT {
  topic: "docker",
  content: "Docker to platforma, która umożliwia tworzenie, testowanie i wdrażanie aplikacji w odizolowanych środowiskach zwanych kontenerami."
};

CREATE knowledge CONTENT {
  topic: "surreal-db",
  content: "SurrealDB to nowoczesna baza danych, która łączy cechy baz relacyjnych, dokumentowych i grafowych."
}; 