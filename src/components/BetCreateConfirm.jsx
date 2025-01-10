/* global BigInt */
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Alert,
  useTheme,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DescriptionIcon from '@mui/icons-material/Description';
import EventIcon from '@mui/icons-material/Event';
import StorageIcon from '@mui/icons-material/Storage';
import DnsIcon from '@mui/icons-material/Dns';
import { useQuotteryContext } from '../contexts/QuotteryContext';
import { truncateMiddle, formatQubicAmount } from './qubic/util';

const TableRowItem = ({ icon, label, children }) => {
  const theme = useTheme();
  return (
    <TableRow>
      <TableCell
        component="th"
        scope="row"
        sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold', color: theme.palette.text.secondary }}
      >
        {icon}
        {label}
      </TableCell>
      <TableCell>{children}</TableCell>
    </TableRow>
  );
};

const BetCreateConfirm = ({ bet }) => {
  const theme = useTheme();
  const { issueBetTxCosts, balance, fetchBalance, walletPublicIdentity } = useQuotteryContext();
  const [hasEnoughBalance, setHasEnoughBalance] = useState(true);

  useEffect(() => {
    const calculateCosts = async () => {
      const costs = await issueBetTxCosts(bet);
      if (walletPublicIdentity) {
        await fetchBalance(walletPublicIdentity);
      }
      if (balance !== null) {
        setHasEnoughBalance(BigInt(balance) >= BigInt(costs));
      }
    };
    calculateCosts();
  }, [bet, balance, issueBetTxCosts, fetchBalance, walletPublicIdentity]);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 0,
        bgcolor: 'inherit',
        borderRadius: 2,  
      }}
    >
      <Box display="flex" alignItems="center" gap={1} mb={3} sx={{ color: theme.palette.primary.main }}>
        <DnsIcon />
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Détails du Pari
        </Typography>
      </Box>

      <TableContainer>
        <Table>
          <TableBody>
            <TableRowItem icon={<DescriptionIcon fontSize="small" />} label="Description">
              {bet.descriptionFull}
            </TableRowItem>

            <TableRowItem icon={<EventIcon fontSize="small" />} label="Date et Heure de Clôture">
              {bet.closeDateTime.date} {bet.closeDateTime.time}
            </TableRowItem>

            <TableRowItem icon={<EventIcon fontSize="small" />} label="Date et Heure de Fin">
              {bet.endDateTime.date} {bet.endDateTime.time}
            </TableRowItem>

            <TableRowItem icon={<StorageIcon fontSize="small" />} label="Options">
              <List dense sx={{ listStyleType: 'disc', pl: 2, m: 0 }}>
                {bet.options.map((option, idx) => (
                  <ListItem key={idx} sx={{ display: 'list-item', py: 0 }}>
                    <ListItemText primary={option} />
                  </ListItem>
                ))}
              </List>
            </TableRowItem>

            <TableRowItem icon={<StorageIcon fontSize="small" />} label="Fournisseurs d'Oracles">
              <List dense sx={{ listStyleType: 'disc', pl: 2, m: 0 }}>
                {bet.providers.map((provider, idx) => (
                  <ListItem key={idx} sx={{ display: 'list-item', py: 0 }}>
                    <ListItemText
                      primary={`${truncateMiddle(provider.publicId, 40)} – ${provider.fee}%`}
                    />
                  </ListItem>
                ))}
              </List>
            </TableRowItem>

            <TableRowItem icon={<AccountBalanceIcon fontSize="small" />} label="Nombre de Qus par Slot">
              {bet.amountPerSlot.toLocaleString()} QUBIC
            </TableRowItem>

            <TableRowItem icon={<AccountBalanceIcon fontSize="small" />} label="Max. Slots par Option">
              {bet.maxBetSlots}
            </TableRowItem>

            <TableRowItem icon={<AccountBalanceIcon fontSize="small" />} label="Frais de Création">
              {bet.costs.toLocaleString()} QUBIC
            </TableRowItem>

            {balance !== null && (
              <TableRowItem icon={<AccountBalanceIcon fontSize="small" />} label="Votre Solde">
                <Typography variant="body2" >
                  {formatQubicAmount(balance)} QUBIC
                </Typography>
                {!hasEnoughBalance && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    Vous n'avez pas assez de solde pour créer ce pari. Votre solde :{' '}
                    {formatQubicAmount(balance)} QUBIC, frais de création :{' '}
                    {formatQubicAmount(bet.costs)} QUBIC.
                  </Alert>
                )}
              </TableRowItem>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default BetCreateConfirm;
