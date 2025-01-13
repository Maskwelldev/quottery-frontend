import React from "react";
import {
  Paper,
  Typography,
  Divider,
  useTheme,
  Stack,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
} from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import AlarmIcon from "@mui/icons-material/Alarm";
import ListAltIcon from "@mui/icons-material/ListAlt";
import PeopleIcon from "@mui/icons-material/People";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import GroupWorkIcon from "@mui/icons-material/GroupWork";
import DescriptionIcon from "@mui/icons-material/Description";
import { formatQubicAmount, truncateMiddle } from "./qubic/util";

const CreateBetDetails = ({
  title,
  closeDate,
  closeTime,
  endDate,
  endTime,
  options,
  providers,
  amountPerSlot,
  maxBetSlots,
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const details = [
    {
      icon: <DescriptionIcon color='action' />,
      label: "Bet description",
      value: title,
    },
    {
      icon: <CalendarTodayIcon color='action' />,
      label: "Closing Date",
      value: closeDate,
    },
    {
      icon: <AccessTimeIcon color='action' />,
      label: "Closing Time",
      value: closeTime,
    },
    {
      icon: <EventAvailableIcon color='action' />,
      label: "Closing Date",
      value: endDate,
    },
    {
      icon: <AlarmIcon color='action' />,
      label: "Closing Time",
      value: endTime,
    },
    {
      icon: <ListAltIcon color='action' />,
      label: "Options",
      value: options?.join(", "),
    },
    {
      icon: <PeopleIcon color='action' />,
      label: "Providers",
      value: providers
        ?.map(
          (provider) =>
            `${truncateMiddle(provider.publicId, 40)} (Fee: ${provider.fee}%)`
        )
        .join(", "),
    },
    {
      icon: <MonetizationOnIcon color='action' />,
      label: "Amount per Slot",
      value: `${formatQubicAmount(amountPerSlot)} QUBIC`,
    },
    {
      icon: <GroupWorkIcon color='action' />,
      label: "Max Bet Slots",
      value: maxBetSlots,
    },
  ];

  return (
    <Paper elevation={0} sx={{ mt: 1 }}>
      <Stack spacing={0}>
        <Typography
          variant={isSmallScreen ? "body1" : "h7"}
          sx={{
            fontWeight: 500,
            color: theme.palette.text.secondary,
            textAlign: "start",
          }}
        >
          Bet Details :
        </Typography>

        <List>
          {details.map((detail, index) => (
            <React.Fragment key={index}>
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: 40 }}>{detail.icon}</ListItemIcon>
                <ListItemText
                  primary={
                    <Typography
                      variant='body2'
                      sx={{
                        fontWeight: 500,
                        color: theme.palette.text.secondary,
                      }}
                    >
                      {detail.label}
                    </Typography>
                  }
                  secondary={
                    <Typography
                      variant='body2'
                      sx={{
                        fontWeight: 500,
                        color: theme.palette.text.primary,
                      }}
                    >
                      {detail.value}
                    </Typography>
                  }
                />
              </ListItem>
              {index < details.length - 1 && <Divider />}
            </React.Fragment>
          ))}

          <Divider sx={{ my: 0 }} />

          <ListItem disableGutters>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <MonetizationOnIcon color='action' />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography
                  variant='body2'
                  sx={{
                    color: theme.palette.text.secondary,
                  }}
                >
                  Total
                </Typography>
              }
              secondary={
                <Typography
                  variant='body2'
                  sx={{
                    fontWeight: 500,
                    color: theme.palette.text.main,
                  }}
                >
                  {`${
                    amountPerSlot
                      ? formatQubicAmount(amountPerSlot * maxBetSlots)
                      : "0"
                  } QUBIC`}
                </Typography>
              }
            />
          </ListItem>
        </List>
      </Stack>
    </Paper>
  );
};

export default CreateBetDetails;
