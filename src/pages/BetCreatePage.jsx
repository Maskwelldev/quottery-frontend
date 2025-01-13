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

/**
 * Label component with an info popover
 */
function LabelWithPopover({ label, description, required = false }) {
  const theme = useTheme();
  return (
    <Box display='flex' alignItems='center' gap={1} mb={0.5}>
      <Typography variant='subtitle1' fontWeight='bold'>
        {label}{" "}
        {required && <span style={{ color: theme.palette.error.main }}>*</span>}
      </Typography>
      <Tooltip title={description} placement='right'>
        <InfoOutlined
          fontSize='small'
          sx={{ color: theme.palette.secondary.main, cursor: "help" }}
        />
      </Tooltip>
    </Box>
  );
}

/**
 * Page component for creating a new bet
 */
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
  const minBetSlotAmount = nodeInfo.min_bet_slot_amount || 10000;

  const [betDescInput, setBetDescInput] = useState("");

  const [bet, setBet] = useState({
    description: "",
    closeDate: "",
    closeTime: "",
    endDate: "",
    endTime: "",
    options: ["", ""],
    providers: [
      {
        publicId: walletPublicIdentity || "",
        fee: "3",
      },
    ],
    amountPerSlot: "10000000",
    maxBetSlots: "",
  });

  // Final object to send in the transaction (contains the hash of the description)
  const [betToSend, setBetToSend] = useState(null);

  // Validation errors
  const [errors, setErrors] = useState({});

  /**
   * Retrieve the creator's identity
   */
  const getCreatorIdentity = async () => {
    const qHelper = new QubicHelper();
    const idPackage = await qHelper.createIdPackage(wallet);
    const sourcePublicKey = idPackage.publicKey;
    return await qHelper.getIdentity(sourcePublicKey);
  };

  /**
   * Upload the bet description to an external JSON asset
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

    // Description
    if (!betDescInput || betDescInput.trim().length === 0) {
      newErrors.description = "Description is required and cannot be empty.";
    } else if (betDescInput.length > 100) {
      newErrors.description = "Description cannot exceed 100 characters.";
    }

    // Close Date/Time and End Date/Time
    const closeValid = bet.closeDate && bet.closeTime;
    const endValid = bet.endDate && bet.endTime;
    if (!closeValid) {
      newErrors.closeDateTime = "Close date and time are required.";
    }
    if (!endValid) {
      newErrors.endDateTime = "End date and time are required.";
    }

    if (closeValid && endValid) {
      const closeDateTime = new Date(`${bet.closeDate}T${bet.closeTime}Z`);
      const endDateTime = new Date(`${bet.endDate}T${bet.endTime}Z`);
      if (endDateTime <= closeDateTime) {
        newErrors.endDateTime = "End Date/Time must be after Close Date/Time.";
      }
    }

    // Ensure Close Date/Time is at least 1 hour in the future
    if (closeValid) {
      const closeDateTime = new Date(`${bet.closeDate}T${bet.closeTime}Z`);
      const minCloseDateTime = new Date(Date.now() + 60 * 60 * 1000);
      if (closeDateTime <= minCloseDateTime) {
        newErrors.closeDateTime =
          "Close Date/Time must be at least 1 hour in the future.";
      }
    }

    // Options: minimum 2, maximum 8, each <= 32 characters
    const trimmedOptions = bet.options.map((opt) => opt.trim());
    const optionSet = new Set(trimmedOptions);
    if (trimmedOptions.length < 2) {
      newErrors.options = "At least 2 options are required.";
    } else if (optionSet.size !== trimmedOptions.length) {
      newErrors.options = "All options must be unique.";
    } else {
      for (let opt of trimmedOptions) {
        if (!opt) {
          newErrors.options = "Options cannot be empty.";
          break;
        }
        if (opt.length > 32) {
          newErrors.options = "Options cannot exceed 32 characters.";
          break;
        }
      }
    }

    // Providers: minimum 1, maximum 8, publicId (60 characters) + fee >= 0
    if (bet.providers.length < 1) {
      newErrors.providers = "At least 1 provider is required.";
    } else {
      for (let provider of bet.providers) {
        if (!provider.publicId || provider.publicId.length !== 60) {
          newErrors.providers =
            "Each provider must have a 60-character public ID.";
          break;
        }
        if (
          provider.fee === "" ||
          isNaN(Number(provider.fee)) ||
          Number(provider.fee) < 0
        ) {
          newErrors.providers =
            "Each provider must have a valid fee (0 or higher).";
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
      newErrors.amountPerSlot = `Amount per slot must be at least ${formatQubicAmount(
        minBetSlotAmount
      )} Qubics.`;
    }

    // Max bet slots: between 1 and 1024
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
   * Handle form submission
   */
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!connected) {
      // If not connected, open the connect modal
      toggleConnectModal();
      return;
    }

    // Validate form data
    if (!validateForm()) {
      return;
    }

    // Calculate Date/Time differences
    const closeDateTime = new Date(`${bet.closeDate}T${bet.closeTime}Z`);
    const endDateTime = new Date(`${bet.endDate}T${bet.endTime}Z`);
    const diffHours = (endDateTime - closeDateTime) / (1000 * 60 * 60);

    if (diffHours <= 0) {
      console.error("End Date/Time must be after Close Date/Time.");
      return;
    }

    const creatorIdentity = await getCreatorIdentity();

    const firstPartHash = hashBetData(
      betDescInput, // Hash the user-entered description
      creatorIdentity,
      bet.providers.map((p) => p.publicId),
      bet.options
    );

    // Second part hash
    const secondPartHash = hashUniqueData();

    // Final hash
    const finalHash = `${firstPartHash}${secondPartHash}`;
    const betDescriptionReference = `###${finalHash}`;

    // Upload description
    const uploadSuccess = await uploadDescription(betDescInput, finalHash);
    if (!uploadSuccess) {
      showSnackbar("Failed to upload description.", "error");
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

    // Uncomment and adjust balance verification if needed
    if (balance !== null && BigInt(balance) < BigInt(betCreationFee)) {
      showSnackbar(
        `Insufficient balance to create this bet. Your balance: ${formatQubicAmount(
          balance
        )} Qubic. Bet creation fee: ${formatQubicAmount(
          betCreationFee
        )} Qubic.`,
        "error"
      );
      return;
    }

    // Prepare bet data to send
    const constructedBet = {
      ...betCopy,
      description: betDescriptionReference,
      descriptionFull: betDescInput,
    };

    setBetToSend(constructedBet);
    setShowConfirmTxModal(true);

    console.log("Valid Bet:", constructedBet);
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
   * Manage bet options dynamically
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
   * Manage providers dynamically
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
   * Calculate minimum End Date/Time (1 hour after Close Date/Time)
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
      maxWidth='md'
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
        {/* Header */}
        <Box display='flex' alignItems='center' mb={3}>
          <IconButton
            aria-label='go back'
            onClick={() => navigate("/")}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant='h5' color='text.primary' fontWeight='bold'>
            Create New Bet
          </Typography>
        </Box>

        <Divider sx={{ mb: theme.spacing(4) }} />

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Description */}
            <Grid item xs={12}>
              <LabelWithPopover
                label='Bet Description'
                description='Provide a brief description of the bet (max 100 characters).'
                required
              />
              <TextField
                fullWidth
                variant='outlined'
                value={betDescInput}
                onChange={(e) => setBetDescInput(e.target.value)}
                placeholder='Enter bet description'
                error={Boolean(errors.description)}
                helperText={errors.description}
                sx={{
                  mt: 1,
                  backgroundColor: theme.palette.background.default,
                }}
                inputProps={{ maxLength: 100 }}
              />
              <Typography variant='body2' align='right' color='text.secondary'>
                {betDescInput.length}/100
              </Typography>
            </Grid>

            {/* Close Date/Time */}
            <Grid item xs={12} md={6}>
              <LabelWithPopover
                label='Close Date and Time (UTC)'
                description='Specify when the betting closes.'
                required
              />
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Box display='flex' gap={2} mt={1}>
                  <DatePicker
                    label='Close Date'
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
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        error={Boolean(errors.closeDateTime)}
                        sx={{
                          backgroundColor: theme.palette.background.default,
                        }}
                      />
                    )}
                  />
                  <TimePicker
                    label='Close Time'
                    value={bet.closeTime ? dayjs(bet.closeTime, "HH:mm") : null}
                    onChange={(newValue) =>
                      setBet({
                        ...bet,
                        closeTime: newValue ? newValue.format("HH:mm") : "",
                      })
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        error={Boolean(errors.closeDateTime)}
                        sx={{
                          backgroundColor: theme.palette.background.default,
                        }}
                      />
                    )}
                  />
                </Box>
              </LocalizationProvider>
            </Grid>

            {/* End Date/Time */}
            <Grid item xs={12} md={6}>
              <LabelWithPopover
                label='End Date and Time (UTC)'
                description='Specify when providers can publish results.'
                required
              />
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Box display='flex' gap={2} mt={1}>
                  <DatePicker
                    label='End Date'
                    value={bet.endDate ? dayjs(bet.endDate) : null}
                    onChange={(newValue) =>
                      setBet({
                        ...bet,
                        endDate: newValue ? newValue.format("YYYY-MM-DD") : "",
                      })
                    }
                    minDate={minEnd?.date ? dayjs(minEnd.date) : null}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        error={Boolean(errors.endDateTime)}
                        sx={{
                          backgroundColor: theme.palette.background.default,
                        }}
                      />
                    )}
                  />
                  <TimePicker
                    label='End Time'
                    value={bet.endTime ? dayjs(bet.endTime, "HH:mm") : null}
                    onChange={(newValue) =>
                      setBet({
                        ...bet,
                        endTime: newValue ? newValue.format("HH:mm") : "",
                      })
                    }
                    minTime={
                      minEnd?.time ? dayjs(minEnd.time, "HH:mm") : undefined
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        error={Boolean(errors.endDateTime)}
                        sx={{
                          backgroundColor: theme.palette.background.default,
                        }}
                      />
                    )}
                  />
                </Box>
              </LocalizationProvider>
            </Grid>

            {/* Date/Time Error */}
            {(errors.closeDateTime || errors.endDateTime) && (
              <Grid item xs={12}>
                <Alert severity='error' sx={{ mt: -2 }}>
                  <AlertTitle>Date/Time Error</AlertTitle>
                  {errors.closeDateTime && <div>{errors.closeDateTime}</div>}
                  {errors.endDateTime && <div>{errors.endDateTime}</div>}
                </Alert>
              </Grid>
            )}

            {/* Options */}
            <Grid item xs={12}>
              <LabelWithPopover
                label='Bet Options (min. 2)'
                description='Add between 2 to 8 options, each up to 32 characters.'
                required
              />
              {bet.options.map((opt, index) => (
                <Box
                  key={index}
                  display='flex'
                  alignItems='center'
                  gap={1}
                  mt={1}
                >
                  <TextField
                    fullWidth
                    variant='outlined'
                    value={opt}
                    onChange={(e) => {
                      const newOptions = [...bet.options];
                      newOptions[index] = e.target.value;
                      setBet({ ...bet, options: newOptions });
                    }}
                    error={Boolean(errors.options)}
                    helperText={
                      index === 0 && errors.options ? errors.options : ""
                    }
                    sx={{ backgroundColor: theme.palette.background.default }}
                    inputProps={{ maxLength: 32 }}
                  />
                  {bet.options.length > 2 && (
                    <IconButton
                      color='error'
                      onClick={() => removeOption(index)}
                      aria-label='Remove option'
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
                <Alert severity='error' sx={{ mt: 2 }}>
                  {errors.options}
                </Alert>
              )}
            </Grid>

            {/* Providers */}
            <Grid item xs={12}>
              <LabelWithPopover
                label='Oracle Providers'
                description='List providers with their 60-character public ID and fees.'
                required
              />
              {bet.providers.map((provider, index) => (
                <Box
                  key={index}
                  display='flex'
                  alignItems='flex-start'
                  gap={2}
                  mt={1}
                >
                  {/* Provider Public ID Field */}
                  <TextField
                    label='Provider Public ID'
                    placeholder='60-character ID (A-Z)'
                    variant='outlined'
                    value={provider.publicId}
                    onChange={(e) => {
                      const value = e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z]/g, "");
                      const newProviders = [...bet.providers];
                      newProviders[index].publicId = value;
                      setBet({ ...bet, providers: newProviders });
                    }}
                    error={Boolean(errors.providers)}
                    helperText={
                      errors.providers &&
                      "Only uppercase letters (A-Z) are allowed."
                    }
                    sx={{
                      flex: 3,
                      backgroundColor: theme.palette.background.default,
                      minHeight: "76px",
                    }}
                    inputProps={{ maxLength: 60 }}
                  />

                  {/* Fee Field */}
                  <TextField
                    label='Fee (%)'
                    variant='outlined'
                    type='number'
                    value={provider.fee}
                    onChange={(e) => {
                      const newProviders = [...bet.providers];
                      newProviders[index].fee = e.target.value;
                      setBet({ ...bet, providers: newProviders });
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position='end'>%</InputAdornment>
                      ),
                    }}
                    error={Boolean(errors.providers)}
                    helperText=' '
                    sx={{
                      flex: 1,
                      backgroundColor: theme.palette.background.default,
                      minHeight: "76px",
                    }}
                  />

                  {/* Remove Button */}
                  {bet.providers.length > 1 && (
                    <IconButton
                      color='error'
                      onClick={() => removeProvider(index)}
                      aria-label='Remove provider'
                      sx={{
                        alignSelf: "center",
                      }}
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
                <Alert severity='error' sx={{ mt: 2 }}>
                  {errors.providers}
                </Alert>
              )}
            </Grid>

            {/* Amount per slot */}
            <Grid item xs={12} md={6}>
              <LabelWithPopover
                label='Amount of Qubics per Slot'
                description={`Minimum amount is ${formatQubicAmount(
                  minBetSlotAmount
                )} Qubics.`}
                required
              />
              <TextField
                fullWidth
                type='number'
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
                InputProps={{
                  endAdornment: (
                    <InputAdornment position='end'>Qubics</InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Max bet slots */}
            <Grid item xs={12} md={6}>
              <LabelWithPopover
                label='Max Number of Bet Slots'
                description='Up to 1024 slots per option.'
                required
              />
              <TextField
                fullWidth
                type='number'
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
                InputProps={{
                  endAdornment: (
                    <InputAdornment position='end'>Slots</InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>

          <Box mt={4} display='flex' justifyContent='center'>
            <Button
              variant='outlined'
              color='primary'
              type='submit'
              size='large'
              startIcon={<RocketLaunchIcon />}
            >
              <Typography
                variant='button'
                sx={{ fontWeight: "bold", fontSize: "0.9rem" }}
              >
                Create Bet
              </Typography>
            </Button>
          </Box>
        </form>
      </Paper>

      {/* Confirmation Modal */}
      <ConfirmTxModal
        open={showConfirmTxModal}
        onClose={() => {
          fetchBets("active");
          setShowConfirmTxModal(false);
        }}
        descriptionData={{
          description: betDescInput, // Display the user's description (not hashed)
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
          description: "Are you sure you want to create this bet ?",
        }}
        onConfirm={async () => {
          // Send betToSend (which contains the hashed description)
          return await signIssueBetTx(betToSend);
        }}
        onTransactionComplete={handleTransactionComplete}
        isCreate={true}
      />
    </Container>
  );
}

export default BetCreatePage;
