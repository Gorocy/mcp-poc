import express, { Request, Response } from 'express';
import cors from 'cors';

const PORT = process.env.CALCULATOR_PORT;

if (!PORT) {
    throw new Error('Missing environment variables');
}

const app = express();

app.use(cors());
app.use(express.json());

app.get('/multiply/:a/:b', (req: Request, res: Response) => {
    try {
        const { a, b } = req.params;
        if (!a || !b) {
            return res.status(400).json({ error: 'Invalid input' });
        }
        const result = parseInt(a) * parseInt(b);
        console.log(result);
        res.json({ result });
    } catch (error) {
        res.status(500).json({ error: 'Invalid input' });
    }
});

app.get('/divide/:a/:b', (req: Request, res: Response) => {
    try {
        const { a, b } = req.params;
        if (!a || !b) {
            return res.status(400).json({ error: 'Invalid input' });
        }
        const result = parseInt(a) / parseInt(b);
        console.log(result);
        res.json({ result });
    } catch (error) {
        res.status(500).json({ error: 'Invalid input' });
    }
});

app.get('/add/:a/:b', (req: Request, res: Response) => {
    try {
        const { a, b } = req.params;
        if (!a || !b) {
            return res.status(400).json({ error: 'Invalid input' });
        }
        const result = parseInt(a) + parseInt(b);
        console.log(result);
        res.json({ result });
    } catch (error) {
        res.status(500).json({ error: 'Invalid input' });
    }
});

app.get('/subtract/:a/:b', (req: Request, res: Response) => {
    try {
        const { a, b } = req.params;
        if (!a || !b) {
            return res.status(400).json({ error: 'Invalid input' });
        }
        const result = parseInt(a) - parseInt(b);
        console.log(result);
        res.json({ result });
    } catch (error) {
        res.status(500).json({ error: 'Invalid input' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

