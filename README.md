# Gomoku (Five in a Row)

A web-based implementation of the classic Gomoku (Five in a Row) game with an AI opponent.

## Features

- Play as black (first) or white (second)
- Three AI difficulty levels: Medium, Hard, and Expert
- Responsive design that works on desktop and mobile
- Visual indicators for the last move and winning line
- Traditional board with star points

## Technologies Used

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui components

## How to Play

1. Choose your stone color (black plays first, white plays second)
2. Select the AI difficulty level
3. Place your stones by clicking on the board intersections
4. The first player to get five stones in a row (horizontally, vertically, or diagonally) wins

## AI Strategy

The AI uses several strategies depending on the difficulty level:

- **Medium**: Basic evaluation and pattern recognition
- **Hard**: Deeper search with Alpha-Beta pruning
- **Expert**: Advanced threat space search and deeper evaluation

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/Starmadebydata/gomoku.git
cd gomoku
npm install
npm run dev
