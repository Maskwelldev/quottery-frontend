import React, { useEffect, useState } from "react";
import {
  Typography,
  Box,
  useMediaQuery,
  useTheme,
  Container,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import BetOverviewTable from "../components/BetOverviewTable";
import BetOverviewCard from "../components/BetOverviewCard";
import { useQuotteryContext } from "../contexts/QuotteryContext";
import ActiveIcon from "@mui/icons-material/CheckCircle";
import HistoryIcon from "@mui/icons-material/History";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { truncateMiddle } from "../components/qubic/util";
import CustomSnackbar from "../components/qubic/ui/CustomSnackbar";
import AnimateBars from "../components/qubic/ui/AnimateBars";

const UserBets = () => {
  const { state, fetchBets } = useQuotteryContext();
  const { activeBets, historicalBets } = state;
  const { walletPublicIdentity } = useQuotteryContext();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();

  const [copied, setCopied] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    if (!activeBets.length && !historicalBets.length) {
      fetchBets("all");
    }
  }, [walletPublicIdentity, fetchBets, activeBets, historicalBets]);

  const handleBetClick = (betId) => {
    navigate(`/bet/${betId}`);
  };

  const annotateBets = (bets, statusValue) => {
    return bets.map((bet) => ({
      ...bet,
      bet_id: bet.bet_id ?? bet.betId,
      full_description: bet.full_description || bet.bet_desc || "",
      status: statusValue,
    }));
  };

  const annotatedActiveBets = annotateBets(
    activeBets.filter((bet) => bet.creator === walletPublicIdentity),
    "active"
  );

  const annotatedHistoricalBets = annotateBets(
    historicalBets.filter((bet) => bet.creator === walletPublicIdentity),
    "historical"
  );

  const renderBets = (bets) => {
    if (isMobile) {
      return (
        <Box display='flex' flexWrap='wrap' gap={2} justifyContent='center'>
          {bets.map((bet) => (
            <BetOverviewCard
              key={bet.bet_id}
              data={bet}
              status={bet.status}
              onClick={() => handleBetClick(bet.bet_id)}
            />
          ))}
        </Box>
      );
    }

    return <BetOverviewTable bets={bets} onRowClick={handleBetClick} />;
  };

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(walletPublicIdentity)
      .then(() => {
        setCopied(true);
        setSnackbar({
          open: true,
          message: "Public ID copied !",
          severity: "success",
        });
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy Public ID:", err);
        setSnackbar({
          open: true,
          message: "Failed to copy Public ID",
          severity: "error",
        });
      });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const BetsHeader = ({ icon, title, address }) => (
    <Box
      mb={2}
      display='flex'
      flexDirection={isMobile ? "column" : "row"}
      alignItems={isMobile ? "flex-start" : "center"}
      gap={isMobile ? 1 : 0}
    >
      <Box display='flex' alignItems='center' gap={1}>
        {icon}
        <Typography variant={isMobile ? "subtitle1" : "h6"}>{title}</Typography>
      </Box>
      {isMobile && address && (
        <Typography
          variant='body2'
          color='textSecondary'
          sx={{ wordBreak: "break-all" }}
        >
          {address}
        </Typography>
      )}
      {!isMobile && address && (
        <Typography
          variant='body1'
          color='textPrimary'
          sx={{ marginLeft: "auto", wordBreak: "break-all" }}
        >
          {address}
        </Typography>
      )}
    </Box>
  );

  if (!annotatedActiveBets.length && !annotatedHistoricalBets.length) {
    return (
      <Box textAlign='center' mt={8}>
        <Typography
          variant={isMobile ? "body1" : "h6"}
          gutterBottom
          mt={12}
          mb={4}
        >
          Loading bets, please wait...
        </Typography>
        <AnimateBars />
      </Box>
    );
  }

  return (
    <Container sx={{ mt: theme.spacing(10), mb: theme.spacing(4) }}>
      <Box
        display='flex'
        flexDirection={isMobile ? "column" : "row"}
        justifyContent={isMobile ? "flex-start" : "space-between"}
        alignItems={isMobile ? "flex-start" : "center"}
        mb={4}
      >
        <Typography variant={isMobile ? "body1" : "h5"} gutterBottom>
          Summary of bets for address :
        </Typography>
        <Box
          display='flex'
          alignItems='center'
          gap={1}
          flexDirection={isMobile ? "column" : "row"}
        >
          <Typography
            variant={isMobile ? "body2" : "h6"}
            color={theme.palette.primary.main}
            sx={{
              wordBreak: "break-all",
              display: "flex",
              alignItems: "center",
            }}
          >
            {truncateMiddle(walletPublicIdentity, 40)}
            <Tooltip title='Copy Public ID'>
              <IconButton
                onClick={copyToClipboard}
                size='small'
                sx={{
                  color: copied
                    ? theme.palette.success.main
                    : theme.palette.text.secondary,
                }}
                aria-label='Copy Public ID'
              >
                {copied ? (
                  <CheckCircleIcon fontSize='small' />
                ) : (
                  <ContentCopyIcon fontSize='small' />
                )}
              </IconButton>
            </Tooltip>
          </Typography>
        </Box>
      </Box>

      <Box mb={4}>
        <BetsHeader
          icon={<ActiveIcon fontSize={isMobile ? "small" : "inherit"} />}
          title='Active Bets'
        />
        {annotatedActiveBets.length > 0 ? (
          renderBets(annotatedActiveBets)
        ) : (
          <Typography variant={isMobile ? "body2" : "body1"}>
            No active bets found.
          </Typography>
        )}
      </Box>

      <Box mb={4}>
        <BetsHeader
          icon={<HistoryIcon fontSize={isMobile ? "small" : "inherit"} />}
          title='Historical Bets'
        />
        {annotatedHistoricalBets.length > 0 ? (
          renderBets(annotatedHistoricalBets)
        ) : (
          <Typography variant={isMobile ? "body2" : "body1"}>
            Historical bets not found.
          </Typography>
        )}
      </Box>

      <CustomSnackbar
        open={snackbar.open}
        handleClose={handleCloseSnackbar}
        message={snackbar.message}
        severity={snackbar.severity}
      />
    </Container>
  );
};

export default UserBets;
