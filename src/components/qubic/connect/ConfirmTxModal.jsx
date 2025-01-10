/* global BigInt */
import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  Box,
  Button,
  LinearProgress,
  useTheme,
  Snackbar,
  Alert,
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import PhonelinkIcon from '@mui/icons-material/Phonelink';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SyncIcon from '@mui/icons-material/Sync';
import { useQubicConnect } from './QubicConnectContext';

import BetDetails from '../../ConfirmBetDetails';

const ConfirmTxModal = ({
  tx,
  open,
  onClose,
  onConfirm,
  onTransactionComplete,
  title,
  amountOfBetSlots,
  optionCosts,
  betOptionDescription,
  isBet,
}) => {
  const { getTick } = useQubicConnect();
  const [confirmedTx, setConfirmedTx] = useState(null);
  const [initialTick, setInitialTick] = useState(null);
  const [tick, setTick] = useState(null);

  const [transactionStatus, setTransactionStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const theme = useTheme();

  const refetchInterval = 3000;

  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    let intervalId;

    const fetchTick = async () => {
      try {
        const t = await getTick();
        setTick(t);
      } catch (error) {
        console.error('Erreur lors de la récupération du tick :', error);
        setTransactionStatus('failure');
        setErrorMessage(
          "Erreur lors de la récupération de l'état de la transaction."
        );
      }
    };

    if (confirmedTx && transactionStatus === 'pending') {
      fetchTick();
      intervalId = setInterval(fetchTick, refetchInterval);
    }

    return () => clearInterval(intervalId);
  }, [confirmedTx, transactionStatus, getTick]);

  useEffect(() => {
    if (tick !== null && confirmedTx !== null && initialTick !== null) {
      const targetTick = confirmedTx.targetTick;
      const normalizedTick =
        ((tick - initialTick) / (targetTick - initialTick)) * 100;
      const widthPercentage = Math.min(Math.max(normalizedTick, 0), 100);

      if (widthPercentage >= 100) {
        if (onTransactionComplete) {
          onTransactionComplete();
        }
        setTransactionStatus('success');
      }
    }
  }, [tick, confirmedTx, initialTick, onTransactionComplete]);

  useEffect(() => {
    if (
      (transactionStatus === 'success' || transactionStatus === 'failure') &&
      open
    ) {
      const timeoutId = setTimeout(() => {
        onClose();
        setTransactionStatus(null);
        setConfirmedTx(null);
        setInitialTick(null);
        setTick(null);
      }, 3000);
      return () => clearTimeout(timeoutId);
    }
  }, [transactionStatus, open, onClose]);

  const startTickFetchInterval = async (cTx) => {
    try {
      setTransactionStatus('pending');
      cTx.targetTick = cTx.targetTick + 2;

      const initialTickValue = await getTick();
      setInitialTick(initialTickValue);
      setConfirmedTx(cTx);
    } catch (error) {
      console.error('Erreur lors du démarrage de la transaction :', error);
      setTransactionStatus('failure');
      setErrorMessage('La transaction a échoué. Veuillez réessayer.');
    }
  };

  const handleConfirm = async () => {
    try {
      const confirmed = await onConfirm();
      if (confirmed && confirmed.targetTick) {
        startTickFetchInterval(confirmed);
      } else {
        throw new Error('Transaction non confirmée correctement.');
      }
    } catch (error) {
      console.error('Erreur lors de la confirmation :', error);
      setTransactionStatus('failure');
      setErrorMessage('La confirmation a échoué. Veuillez réessayer.');
    }
  };

  const handleCloseSnackbar = () => {
    setErrorMessage('');
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullScreen={isMobile}
        fullWidth
        maxWidth="sm"
        aria-labelledby="confirm-tx-dialog-title"
        BackdropProps={{
          sx: {
            backdropFilter: 'blur(8px)',
          },
        }}
        PaperProps={{
          sx: {
            elevation: 'none !important',
            p: isMobile ? 0 : 1,
            py: isMobile ? 1 : 0,
            backgroundColor: theme.palette.background.card,
          },
          elevation: 2,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '0.4rem',
            backgroundColor: theme.palette.primary.main,
          }}
        />
        {/* --------- Title --------- */}
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingRight: '48px',
            mt: 1,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <PhonelinkIcon
              fontSize="small"
              sx={{ color: theme.palette.text.primary }}
            />
            <Typography
              variant="h6"
              color={theme.palette.text.primary}
              sx={{ fontWeight: 'bold' }}
            >
              qubic{' '}
              <span style={{ color: theme.palette.primary.main }}>connect</span>
            </Typography>
          </Box>

          <IconButton
            color={theme.palette.primary.main}
            aria-label="close"
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        {/* --------- Content --------- */}
        <DialogContent>
          {/* <Divider sx={{ mb: 2, mt: 2 }} /> */}

          <Box display="flex" flexDirection="column" gap={3}>
            {/* ---------- Transaction SUCCESS ---------- */}
            {transactionStatus === 'success' && (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                gap={2}
              >
                <CheckCircleIcon color="success" sx={{ fontSize: 36, mt: 2 }} />
                <Typography variant="h6" color="success.main">
                  Transaction réussie !
                </Typography>
              </Box>
            )}

            {/* ---------- Transaction FAILURE ---------- */}
            {transactionStatus === 'failure' && (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                gap={2}
              >
                <CancelIcon color="error" sx={{ fontSize: 36, mt: 2 }} />
                <Typography variant="h6" color="error.main">
                  Transaction failed.
                </Typography>
              </Box>
            )}

            {/* ---------- Transaction PENDING ---------- */}
            {transactionStatus === 'pending' && confirmedTx && (
              <>
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  mb={1}
                  sx={{
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(360deg)' },
                      '100%': { transform: 'rotate(0deg)' },
                    },
                  }}
                >
                  <SyncIcon
                    color="primary"
                    sx={{ fontSize: 30, animation: 'spin 2s linear infinite' }}
                  />
                </Box>

                <Typography
                  variant="body1"
                  color="text.primary"
                  textAlign={'center'}
                >
                  Please wait for the transaction to be confirmed.
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Current Tick: {tick} / {confirmedTx.targetTick}
                </Typography>
                <Box sx={{ width: '100%' }}>
                  <LinearProgress
                    variant="determinate"
                    value={
                      tick
                        ? Math.min(
                            Math.max(
                              ((tick - initialTick) /
                                (confirmedTx.targetTick - initialTick)) *
                                100,
                              0
                            ),
                            100
                          )
                        : 0
                    }
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: theme.palette.grey[300],
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: theme.palette.primary.main,
                      },
                    }}
                  />
                </Box>
              </>
            )}

            {transactionStatus === null && (
              <>
                <Typography
                  variant="h7"
                  align="center"
                  sx={{
                    mt: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <WarningAmberIcon
                    color="warning"
                    sx={{ fontSize: 28, mr: 1 }}
                  />
                  {tx.description}
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-block',
                      ml: '0.2rem',
                      fontWeight: 'bold',
                      animation: '1s blink step-start infinite',
                      '@keyframes blink': {
                        '50%': { opacity: 0 },
                      },
                    }}
                  >
                    _
                  </Box>
                </Typography>

                {isBet && (
                  <BetDetails
                    title={title}
                    betOptionDescription={betOptionDescription}
                    amountOfBetSlots={amountOfBetSlots}
                    optionCosts={optionCosts}
                  />
                )}

                {/* Button group */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 4,
                    mt: 3,
                  }}
                >
                  <Button
                    variant="outlined"
                    color="tertiary"
                    startIcon={<CancelIcon />}
                    onClick={onClose}
                  >
                    CANCEL
                  </Button>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<CheckCircleIcon />}
                    onClick={handleConfirm}
                  >
                    CONFIRM
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      {/* --------- Snackbar --------- */}
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="error"
          sx={{ width: '100%' }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ConfirmTxModal;
