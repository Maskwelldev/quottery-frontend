// src/components/RandomBetsTicker.js
import React, { useEffect, useState } from 'react';
import { Box, Chip, Paper } from '@mui/material';
import { motion } from 'framer-motion';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useQuotteryContext } from '../../contexts/QuotteryContext';
import { useTheme } from '@mui/material/styles';

const icons = [<TrendingUpIcon />];

const RandomBetsTicker = () => {
  const { state } = useQuotteryContext();
  const [randomBets, setRandomBets] = useState([]);

  const theme = useTheme();

  useEffect(() => {
    const allBets = [
      ...state.activeBets,
      ...state.lockedBets,
      ...state.waitingForResultsBets,
      ...state.historicalBets,
    ];

    const shuffledBets = allBets.sort(() => 0.5 - Math.random()).slice(0, 5);
    setRandomBets(shuffledBets);
  }, [state]);

  return (
    <Box
      sx={{
        width: '100%',
        position: 'fixed',
        bottom: 0,
        left: 0,
        zIndex: 1000,
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
        backgroundColor: 'transparent',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: '100%',
          py: 1,
          px: 2,
          bgcolor: 'transparent',
          borderRadius: 0,
          pointerEvents: 'auto',
        }}
      >
        <Box
          component={motion.div}
          sx={{
            display: 'flex',
            gap: '2rem',
            whiteSpace: 'nowrap',
          }}
          initial={{ x: '100%' }}
          animate={{ x: '-100%' }}
          transition={{
            ease: 'linear',
            duration: 20,
            repeat: Infinity,
          }}
        >
          {randomBets.map((bet, index) => (
            <Chip
              key={bet.bet_id || index}
              label={bet.full_description || bet.bet_desc}
              icon={icons[index % icons.length]}
              sx={{
                fontSize: '0.9rem',
                fontWeight: 'bold',
                backgroundColor: theme.palette.primary.main,
                color: 'primary.contrastText',
                boxShadow: 1,
                '&:hover': {
                  backgroundColor: 'primary.main',
                },
              }}
            />
          ))}
        </Box>
      </Paper>
    </Box>
  );
};

export default RandomBetsTicker;
