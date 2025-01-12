/* global BigInt */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "../contexts/SnackbarContext";
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Divider,
  IconButton,
  TextField,
  Tooltip,
  InputAdornment,
  Grid,
  Alert,
  AlertTitle,
  useTheme,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddCircleOutline from "@mui/icons-material/AddCircleOutline";
import Close from "@mui/icons-material/Close";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import ConfirmTxModal from "../components/qubic/connect/ConfirmTxModal";
import { useQubicConnect } from "../components/qubic/connect/QubicConnectContext";
import { useQuotteryContext } from "../contexts/QuotteryContext";
import { QubicHelper } from "@qubic-lib/qubic-ts-library/dist/qubicHelper";
import {
  hashBetData,
  hashUniqueData,
} from "../components/qubic/util/hashUtils";
import { formatQubicAmount } from "../components/qubic/util";
import { externalJsonAssetUrl } from "../components/qubic/util/commons";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";

function LabelWithPopover({ label, description, required = false }) {
  const theme = useTheme();
  return (
    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
      <Typography variant="subtitle1" fontWeight="bold">
        {label}{" "}
        {required && <span style={{ color: theme.palette.error.main }}>*</span>}
      </Typography>
      <Tooltip title={description} placement="right">
        <InfoOutlined
          fontSize="small"
          sx={{ color: theme.palette.secondary.main, cursor: "help" }}
        />
      </Tooltip>
    </Box>
  );
}

function BetCreatePage() {
  const navigate = useNavigate();
  const theme = useTheme();

  const [showConfirmTxModal, setShowConfirmTxModal] = useState(false);
  const { connected, toggleConnectModal, wallet } = useQubicConnect();
  const { showSnackbar } = useSnackbar();

  // Quottery Context
  const {
    fetchBets,
    signIssueBetTx,
    balance,
    issueBetTxCosts,
    fetchBalance,
    walletPublicIdentity,
    state,
  } = useQuotteryContext();

  // Node Info
  const nodeInfo = state.nodeInfo || {};
  const minBetSlotAmount = nodeInfo.min_bet_slot_amount || 10000; // Amount min per slot

  const [betDescInput, setBetDescInput] = useState(
    "My First Bet Description with a maximum of 100 characters."
  );

  const [bet, setBet] = useState({
    // We don't hash the description here, we hash it in the final betToSend object
    description: "", 
    closeDate: dayjs().add(1, "day").format("YYYY-MM-DD"),
    closeTime: "12:00",
    endDate: dayjs().add(2, "day").format("YYYY-MM-DD"),
    endTime: "12:00",
    options: ["Option 1", "Option 2"],
    providers: [
      {
        publicId:
          "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        fee: "1",
      },
    ],
    amountPerSlot: "10000",
    maxBetSlots: "10",
  });

  // Final object to send in the Tx (containing the hash of the description)
  const [betToSend, setBetToSend] = useState(null);

  // Validation errors
  const [errors, setErrors] = useState({});

  /**
   * Return the identity of the creator of the bet
   */
  const getCreatorIdentity = async () => {
    const qHelper = new QubicHelper();
    const idPackage = await qHelper.createIdPackage(wallet);
    const sourcePublicKey = idPackage.publicKey;
    return await qHelper.getIdentity(sourcePublicKey);
  };

  /**
   * Upload the bet description to the external JSON asset
   */
  const uploadDescription = async (description, encodedHash) => {
    try {
      const response = await fetch(`${externalJsonAssetUrl}/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ hash: encodedHash, description }),
      });
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error("Error uploading description:", error);
      return false;
    }
  };

  /**
   * Validate the form data
   */
  const validateForm = () => {
    let newErrors = {};

    if (!betDescInput || betDescInput.length === 0) {
      newErrors.description = "Description is required.";
    } else if (betDescInput.length > 100) {
      newErrors.description = "Description cannot exceed 100 characters.";
    }

    // CloseDate / EndDate + Time
    const closeValid = bet.closeDate && bet.closeTime;
    const endValid = bet.endDate && bet.endTime;
    if (!closeValid) {
      newErrors.closeDateTime = "Close date/time is required.";
    }
    if (!endValid) {
      newErrors.endDateTime = "End date/time is required.";
    }
    if (closeValid && endValid) {
      const closeDateTime = new Date(`${bet.closeDate}T${bet.closeTime}Z`);
      const endDateTime = new Date(`${bet.endDate}T${bet.endTime}Z`);
      if (endDateTime <= closeDateTime) {
        newErrors.endDateTime = "End DateTime must be after Close DateTime.";
      }
    }
    // Verify Close DateTime is at least 1 hour in the future
    if (closeValid) {
      const closeDateTime = new Date(`${bet.closeDate}T${bet.closeTime}Z`);
      const minCloseDateTime = new Date(Date.now() + 60 * 60 * 1000);
      if (closeDateTime <= minCloseDateTime) {
        newErrors.closeDateTime =
          "Close DateTime must be at least 1 hour in the future.";
      }
    }

    // Options : min 2, max 8, each <= 32 chars
    if (bet.options.length < 2) {
      newErrors.options = "At least 2 options are required.";
    } else {
      for (let opt of bet.options) {
        if (!opt || opt.trim() === "") {
          newErrors.options = "All options must be non-empty.";
          break;
        }
        if (opt.length > 32) {
          newErrors.options = "Options cannot exceed 32 characters.";
          break;
        }
      }
    }

    // Providers : min 1, max 8, publicId(60 chars) + fee >= 0
    if (bet.providers.length < 1) {
      newErrors.providers = "At least 1 provider is required.";
    } else {
      for (let p of bet.providers) {
        if (!p.publicId || p.publicId.length !== 60) {
          newErrors.providers = "Each provider must have a 60-char publicId.";
          break;
        }
        if (!p.fee || isNaN(Number(p.fee)) || Number(p.fee) < 0) {
          newErrors.providers = "Each provider must have a valid fee (>=0).";
          break;
        }
      }
    }

    // Amount per slot
    if (
      !bet.amountPerSlot ||
      isNaN(Number(bet.amountPerSlot)) ||
      Number(bet.amountPerSlot) < minBetSlotAmount
    ) {
      newErrors.amountPerSlot = `Amount per slot must be >= ${minBetSlotAmount}.`;
    }

    // Max bet slots : 1 à 1024
    if (
      !bet.maxBetSlots ||
      isNaN(Number(bet.maxBetSlots)) ||
      Number(bet.maxBetSlots) < 1 ||
      Number(bet.maxBetSlots) > 1024
    ) {
      newErrors.maxBetSlots = "Max bet slots must be between 1 and 1024.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Form submission
   */
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!connected) {
      // If not connected, open the connect modal
      toggleConnectModal();
      return;
    }

    // Validation
    if (!validateForm()) {
      return;
    }

    // Close DateTime and End DateTime
    const closeDateTime = new Date(`${bet.closeDate}T${bet.closeTime}Z`);
    const endDateTime = new Date(`${bet.endDate}T${bet.endTime}Z`);
    const diffHours = (endDateTime - closeDateTime) / (1000 * 60 * 60);

    if (diffHours <= 0) {
      console.error("End DateTime must be after Close DateTime.");
      return;
    }

    const creatorIdentity = await getCreatorIdentity();

    const firstPartHash = hashBetData(
      betDescInput, // We hash the version entered by the user
      creatorIdentity,
      bet.providers.map((p) => p.publicId),
      bet.options
    );

    // Second part hash
    const secondPartHash = hashUniqueData();

    // Final hash
    const finalHash = `${firstPartHash}${secondPartHash}`;
    const betDescriptionReference = `###${finalHash}`;

    // Description upload 
    const uploadSuccess = await uploadDescription(betDescInput, finalHash);
    if (!uploadSuccess) {
      console.error("Failed to upload description");
      return;
    }

    // Calculate creation costs
    const betCopy = {
      ...bet,
      diffHours: diffHours,
      closeDateTime: { date: bet.closeDate, time: bet.closeTime },
      endDateTime: { date: bet.endDate, time: bet.endTime },
    };

    const betCreationFee = await issueBetTxCosts(betCopy);
    betCopy.costs = betCreationFee;

    // Refresh balance
    if (walletPublicIdentity) {
      await fetchBalance(walletPublicIdentity);
    }

    // Verify balance
    if (balance !== null && BigInt(balance) < BigInt(betCreationFee)) {
      showSnackbar(
        `You do not have enough balance to create this bet. Your balance: ${formatQubicAmount(
          balance
        )} Qubic. Bet creation fee: ${formatQubicAmount(betCreationFee)} Qubic.`,
        "error"
      );
      return;
    }

    // Bet data to send
    const constructedBet = {
      ...betCopy,
      description: betDescriptionReference,
      descriptionFull: betDescInput,
    };

    setBetToSend(constructedBet);
    setShowConfirmTxModal(true);

    console.log("Valid Bet :", constructedBet);
  };

  /**
   * Callback when the transaction is complete
   */
  const handleTransactionComplete = async () => {
    if (walletPublicIdentity) {
      await fetchBalance(walletPublicIdentity);
    }
  };

  /**
   * Dynamically manage options
   */
  const addOption = () => {
    if (bet.options.length < 8) {
      setBet({ ...bet, options: [...bet.options, ""] });
    }
  };
  const removeOption = (index) => {
    const newOptions = bet.options.filter((_, i) => i !== index);
    setBet({ ...bet, options: newOptions });
  };

  /**
   * Dynamically manage providers
   */
  const addProvider = () => {
    if (bet.providers.length < 8) {
      setBet({
        ...bet,
        providers: [...bet.providers, { publicId: "", fee: "" }],
      });
    }
  };
  const removeProvider = (index) => {
    const newProviders = bet.providers.filter((_, i) => i !== index);
    setBet({ ...bet, providers: newProviders });
  };

  /**
   * Min End Date/Time (1h after Close Date/Time)
   */
  const calculateMinEndDateTime = () => {
    if (!bet.closeDate || !bet.closeTime) return null;
    const closeDT = new Date(`${bet.closeDate}T${bet.closeTime}Z`);
    if (isNaN(closeDT.getTime())) return null;

    const minEndDateTime = new Date(closeDT.getTime() + 60 * 60 * 1000);
    const isoString = minEndDateTime.toISOString();
    const minDate = isoString.split("T")[0];
    const minTime = isoString.split("T")[1].slice(0, 5);
    return { date: minDate, time: minTime };
  };
  const minEnd = calculateMinEndDateTime();

  return (
    <Container
      maxWidth="md"
      sx={{ mt: theme.spacing(10), mb: theme.spacing(4) }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 0, md: 4 },
          backgroundColor: {
            xs: theme.palette.background.default,
            md: theme.palette.background.paper,
          },
          borderRadius: 1,
          border: {
            md: `1px solid ${theme.palette.secondary.main}`,
            xs: "none",
          },
        }}
      >
        {/* HEADER */}
        <Box display="flex" alignItems="center" mb={3}>
          <IconButton
            aria-label="go back"
            onClick={() => navigate("/")}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" color="text.primary" fontWeight="bold">
            Create New Bet
          </Typography>
        </Box>

        <Divider sx={{ mb: theme.spacing(4) }} />

        {/* FORM */}
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Description */}
            <Grid item xs={12}>
              <LabelWithPopover
                label="Bet Description"
                description="This is the bet description with a maximum of 100 characters."
                required
              />
              <TextField
                fullWidth
                variant="outlined"
                value={betDescInput}
                onChange={(e) => setBetDescInput(e.target.value)}
                placeholder="Enter bet description"
                error={Boolean(errors.description)}
                helperText={errors.description}
                sx={{
                  mt: 1,
                  backgroundColor: theme.palette.background.default,
                }}
              />
              <Typography variant="body2" align="right" color="text.secondary">
                {betDescInput.length}/100
              </Typography>
            </Grid>

            {/* Close Date/Time */}
            <Grid item xs={12} md={6}>
              <LabelWithPopover
                label="Close Date and Time (UTC)"
                description="The date/time when the bet closes."
                required
              />
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Box display="flex" gap={2} mt={1}>
                  <DatePicker
                    label="Close Date"
                    value={bet.closeDate ? dayjs(bet.closeDate) : null}
                    onChange={(newValue) =>
                      setBet({
                        ...bet,
                        closeDate: newValue
                          ? newValue.format("YYYY-MM-DD")
                          : "",
                      })
                    }
                    minDate={dayjs()}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: Boolean(errors.closeDateTime),
                        sx: {
                          backgroundColor: theme.palette.background.default,
                        },
                      },
                      openPickerButton: {
                        sx: { color: theme.palette.primary.main },
                      },
                    }}
                  />
                  <TimePicker
                    label="Close Time"
                    value={bet.closeTime ? dayjs(bet.closeTime, "HH:mm") : null}
                    onChange={(newValue) =>
                      setBet({
                        ...bet,
                        closeTime: newValue ? newValue.format("HH:mm") : "",
                      })
                    }
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: Boolean(errors.closeDateTime),
                        sx: {
                          backgroundColor: theme.palette.background.default,
                        },
                      },
                      openPickerButton: {
                        sx: { color: theme.palette.primary.main },
                      },
                    }}
                  />
                </Box>
              </LocalizationProvider>
            </Grid>

            {/* End Date/Time */}
            <Grid item xs={12} md={6}>
              <LabelWithPopover
                label="End Date and Time (UTC)"
                description="The date/time when providers can publish results."
                required
              />
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Box display="flex" gap={2} mt={1}>
                  <DatePicker
                    label="End Date"
                    value={bet.endDate ? dayjs(bet.endDate) : null}
                    onChange={(newValue) =>
                      setBet({
                        ...bet,
                        endDate: newValue ? newValue.format("YYYY-MM-DD") : "",
                      })
                    }
                    minDate={minEnd?.date ? dayjs(minEnd.date) : null}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: Boolean(errors.endDateTime),
                        sx: {
                          backgroundColor: theme.palette.background.default,
                        },
                      },
                      openPickerButton: {
                        sx: { color: theme.palette.primary.main },
                      },
                    }}
                  />
                  <TimePicker
                    label="End Time"
                    value={bet.endTime ? dayjs(bet.endTime, "HH:mm") : null}
                    onChange={(newValue) =>
                      setBet({
                        ...bet,
                        endTime: newValue ? newValue.format("HH:mm") : "",
                      })
                    }
                    minTime={minEnd?.time ? dayjs(minEnd.time, "HH:mm") : null}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: Boolean(errors.endDateTime),
                        sx: {
                          backgroundColor: theme.palette.background.default,
                        },
                      },
                      openPickerButton: {
                        sx: { color: theme.palette.primary.main },
                      },
                    }}
                  />
                </Box>
              </LocalizationProvider>
            </Grid>

            {/* Date / Time Error */}
            {(errors.closeDateTime || errors.endDateTime) && (
              <Grid item xs={12}>
                <Alert severity="error" sx={{ mt: -2 }}>
                  <AlertTitle>Date/Time Error</AlertTitle>
                  {errors.closeDateTime && <div>{errors.closeDateTime}</div>}
                  {errors.endDateTime && <div>{errors.endDateTime}</div>}
                </Alert>
              </Grid>
            )}

            {/* Options */}
            <Grid item xs={12}>
              <LabelWithPopover
                label="Bet Options (min. 2)"
                description="Add up to 8 options, each <= 32 chars."
                required
              />
              {bet.options.map((opt, index) => (
                <Box
                  key={index}
                  display="flex"
                  alignItems="center"
                  gap={1}
                  mt={1}
                >
                  <TextField
                    fullWidth
                    variant="outlined"
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...bet.options];
                      newOpts[index] = e.target.value;
                      setBet({ ...bet, options: newOpts });
                    }}
                    error={Boolean(errors.options)}
                    sx={{ backgroundColor: theme.palette.background.default }}
                  />
                  {bet.options.length > 2 && (
                    <IconButton
                      color="error"
                      onClick={() => removeOption(index)}
                    >
                      <Close />
                    </IconButton>
                  )}
                </Box>
              ))}
              {bet.options.length < 8 && (
                <Button
                  startIcon={<AddCircleOutline />}
                  onClick={addOption}
                  sx={{
                    mt: 1,
                    color:
                      theme.palette.mode === "dark"
                        ? theme.palette.primary.main
                        : theme.palette.text.primary,
                  }}
                >
                  Add Option
                </Button>
              )}
              {errors.options && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {errors.options}
                </Alert>
              )}
            </Grid>

            {/* Providers */}
            <Grid item xs={12}>
              <LabelWithPopover
                label="Oracle Providers"
                description="List providers (60-char publicId) and their fees."
                required
              />
              {bet.providers.map((p, index) => (
                <Box
                  key={index}
                  display="flex"
                  alignItems="center"
                  gap={1}
                  mt={1}
                >
                  <TextField
                    label="Provider PublicId"
                    placeholder="60-char ID"
                    variant="outlined"
                    value={p.publicId}
                    onChange={(e) => {
                      const newProv = [...bet.providers];
                      newProv[index].publicId = e.target.value;
                      setBet({ ...bet, providers: newProv });
                    }}
                    error={Boolean(errors.providers)}
                    sx={{
                      flex: 3,
                      backgroundColor: theme.palette.background.default,
                    }}
                  />
                  <TextField
                    label="Fee (%)"
                    variant="outlined"
                    type="number"
                    value={p.fee}
                    onChange={(e) => {
                      const newProv = [...bet.providers];
                      newProv[index].fee = e.target.value;
                      setBet({ ...bet, providers: newProv });
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end"></InputAdornment>
                      ),
                    }}
                    error={Boolean(errors.providers)}
                    sx={{
                      flex: 1,
                      backgroundColor: theme.palette.background.default,
                    }}
                  />
                  {bet.providers.length > 1 && (
                    <IconButton
                      color="error"
                      onClick={() => removeProvider(index)}
                    >
                      <Close />
                    </IconButton>
                  )}
                </Box>
              ))}
              {bet.providers.length < 8 && (
                <Button
                  startIcon={<AddCircleOutline />}
                  onClick={addProvider}
                  sx={{
                    mt: 1,
                    color:
                      theme.palette.mode === "dark"
                        ? theme.palette.primary.main
                        : theme.palette.text.primary,
                  }}
                >
                  Add Provider
                </Button>
              )}
              {errors.providers && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {errors.providers}
                </Alert>
              )}
            </Grid>

            {/* Amount per slot */}
            <Grid item xs={12} md={6}>
              <LabelWithPopover
                label="Amount of Qubics per Slot"
                description={`Min amount is ${formatQubicAmount(
                  minBetSlotAmount
                )} qubics.`}
                required
              />
              <TextField
                fullWidth
                type="number"
                value={bet.amountPerSlot}
                onChange={(e) =>
                  setBet({ ...bet, amountPerSlot: e.target.value })
                }
                error={Boolean(errors.amountPerSlot)}
                helperText={errors.amountPerSlot}
                sx={{
                  mt: 1,
                  backgroundColor: theme.palette.background.default,
                }}
              />
            </Grid>

            {/* Max bet slots */}
            <Grid item xs={12} md={6}>
              <LabelWithPopover
                label="Max Number of Bet Slots"
                description="Up to 1024 slots per option."
                required
              />
              <TextField
                fullWidth
                type="number"
                value={bet.maxBetSlots}
                onChange={(e) =>
                  setBet({ ...bet, maxBetSlots: e.target.value })
                }
                error={Boolean(errors.maxBetSlots)}
                helperText={errors.maxBetSlots}
                sx={{
                  mt: 1,
                  backgroundColor: theme.palette.background.default,
                }}
              />
            </Grid>
          </Grid>

          <Box mt={4} display="flex" justifyContent="center">
            <Button
              variant="outlined"
              color="primary"
              type="submit"
              size="large"
              startIcon={<RocketLaunchIcon />}
            >
              <Typography
                variant="button"
                sx={{ fontWeight: "bold", fontSize: "0.9rem" }}
              >
                Create Bet
              </Typography>
            </Button>
          </Box>
        </form>
      </Paper>

      <ConfirmTxModal
        open={showConfirmTxModal}
        onClose={() => {
          fetchBets("active");
          setShowConfirmTxModal(false);
        }}
        descriptionData={{
          description: betDescInput, // Displayed the user's description (not hashed)
          closeDate: bet.closeDate,
          closeTime: bet.closeTime,
          endDate: bet.endDate,
          endTime: bet.endTime,
          options: bet.options,
          providers: bet.providers,
          amountPerSlot: bet.amountPerSlot,
          maxBetSlots: bet.maxBetSlots,
        }}
        tx={{
          description: "Confirm to proceed ?",
        }}
        onConfirm={async () => {
          // We send betToSend (which contains the hashed description)
          return await signIssueBetTx(betToSend);
        }}
        onTransactionComplete={handleTransactionComplete}
        isCreate={true}
      />
    </Container>
  );
}

export default BetCreatePage;
