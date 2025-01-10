import React from 'react';
import {
  Box,
  Typography,
  Divider,
  Stack,
  Chip,
  Avatar,
  useTheme,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import HelpIcon from '@mui/icons-material/Help';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import DiamondIcon from '@mui/icons-material/Diamond';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import EggIcon from '@mui/icons-material/Egg';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import QubicCoin from '../assets/qubic-coin.svg';
import { sumArray } from './qubic/util';
import { formatDate } from '../components/qubic/util/commons';
import { formatQubicAmount } from './qubic/util';

const statusIcons = {
  active: { icon: <CheckCircleIcon fontSize="small" />, label: 'Active', color: 'success' },
  locked: { icon: <LockIcon fontSize="small" />, label: 'Locked', color: 'warning' },
  published: { icon: <EmojiEventsIcon fontSize="small" />, label: 'Published', color: 'primary' },
  waiting: { icon: <HelpIcon fontSize="small" />, label: 'Waiting', color: 'default' },
};

const getHotLevelIcon = (totalQus, slotsTaken) => {
  if (totalQus >= 1000000000 || slotsTaken >= 100) return <DiamondIcon fontSize="small" color="primary" />;
  if (totalQus >= 500000000 || slotsTaken >= 50) return <LocalFireDepartmentIcon fontSize="small" color="error" />;
  if (totalQus >= 100000000 || slotsTaken >= 10) return <WhatshotIcon fontSize="small" color="warning" />;
  if (totalQus >= 10000000 || slotsTaken >= 5) return <EggIcon fontSize="small" color="action" />;
  return <EggIcon fontSize="small" color="disabled" />;
};

function ModernBetList({ bets, onBetClick }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: 2,
      }}
    >
      <List disablePadding>
        {bets.map((data, index) => {
          const slotsTaken = sumArray(data.current_num_selection);
          const statusData = statusIcons[data.status] || null;
          const hotLevelIcon = getHotLevelIcon(data.current_total_qus, slotsTaken);

          return (
            <React.Fragment key={data.bet_id}>
              <ListItem
                onClick={() => onBetClick(data.bet_id)}
                sx={{
                  py: 2.5,
                  px: 3,
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  justifyContent: 'space-between',
                  transition: 'background-color 0.2s',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              >
                <Stack spacing={0.5} mb={{ xs: 1, sm: 0 }} sx={{ maxWidth: { xs: '100%', sm: '60%' } }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {statusData && (
                      <Chip
                        icon={statusData.icon}
                        label={statusData.label}
                        color={statusData.color}
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    )}
                    <Typography variant="h6" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {data.full_description || data.bet_desc}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Closes at: {formatDate(data.close_date)} {data.close_time.slice(0, -3)} UTC
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={3} alignItems="center">
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    {hotLevelIcon}
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {slotsTaken} slots
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Fee: {sumArray(data.oracle_fee)}%
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Burn: 2%
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Avatar src={QubicCoin} alt="Qubic Coin" sx={{ width: 24, height: 24 }} />
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {formatQubicAmount(data.current_total_qus)} QUBIC
                    </Typography>
                  </Stack>
                </Stack>
              </ListItem>
              {index < bets.length - 1 && <Divider />}
            </React.Fragment>
          );
        })}
      </List>
    </Box>
  );
}

export default ModernBetList;
