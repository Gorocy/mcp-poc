import express, { Request, Response } from 'express';
import cors from 'cors';
import slugify from 'slugify';
import Surreal from 'surrealdb';

const db = new Surreal();

async function initDatabase() {
  try {
    // Connect to SurrealDB
    await db.connect(process.env.SURREALDB_URL || 'http://localhost:8000/rpc');
    
    // Correct way to login - without namespace in parameters
    await db.signin({
      username: 'root',
      password: 'root'
    });
    
    // Select namespace and database after login
    await db.use({
      namespace: 'mcp',
      database: 'knowledge'
    });
    
    console.log('Connected to SurrealDB');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

const app = express();

app.use(cors());
app.use(express.json());

app.get('/knowledge', async (req: Request, res: Response) => {
  const topic = req.query.topic?.toString();

  try {
    if (!topic) {
      // Get all topics
      const result = await db.query('SELECT topic FROM knowledge');
      const queryResult = result as unknown as [{ result: Array<{ topic: string }> }];
      const topics = queryResult[0]?.result?.map(item => item.topic) || [];
      return res.json(topics);
    }

    // Get specific topic
    const result = await db.query(
      'SELECT * FROM knowledge WHERE topic = $topic',
      { topic: topic.toUpperCase() }
    );
    
    const queryResult = result as unknown as [{ result: Array<{ topic: string, content: string }> }];
    const topicData = queryResult[0]?.result?.[0];

    if (!topicData) {
      return res.status(404).send('Topic not found');
    }

    res.json(topicData);
  } catch (error) {
    console.error('Error fetching knowledge:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/knowledge', async (req: Request, res: Response) => {
  const { topic, content } = req.body;

  console.log('Received POST request for /knowledge:', { topic, content });

  if (!topic || !content) {
    console.log('Missing topic or content');
    return res.status(400).send('Missing topic or content');
  }

  const topicIdentifierSlug = slugify.default(topic);
  console.log('Slug for topic:', topicIdentifierSlug);

  try {
    // Add new knowledge
    console.log('Attempting to save to database:', { topic: topicIdentifierSlug, content });
    const result = await db.query(
      'CREATE knowledge SET topic = $topic, content = $content',
      { topic: topicIdentifierSlug, content: content }
    );
    
    console.log('Database query result:', result);
    res.status(201).send('Knowledge created');
  } catch (error) {
    console.error('Error creating knowledge:', error);
    return res.status(409).send('Topic already exists or server error');
  }
});

// Initialize database before starting the server
initDatabase().then(() => {
  app.listen(8080, () => {
    console.log('Service running on port 8080');
  });
});
