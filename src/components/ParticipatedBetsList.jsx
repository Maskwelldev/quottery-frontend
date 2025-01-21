import React from "react";
import { Box, Typography, Link, Card, CardContent } from "@mui/material";

const ParticipatedBetsList = ({ bets, onBetClick }) => {
  return (
    <Box display='flex' flexDirection='column' gap={2}>
      {bets.map((bet) => (
        <Card key={bet.bet_id} variant='outlined'>
          <CardContent>
            <Typography variant='h6'>
              {bet.full_description || "No Description"}
            </Typography>
            <Typography variant='body2'>Bet ID: {bet.bet_id}</Typography>
            <Typography variant='body2'>
              Option: {bet.selectedOption}
            </Typography>
            <Link href='#' onClick={() => onBetClick(bet.bet_id)}>
              View Bet
            </Link>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default ParticipatedBetsList;
