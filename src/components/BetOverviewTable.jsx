import React, { memo, useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { useTheme, Box, Typography, Fade } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HelpIcon from "@mui/icons-material/Help";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import DiamondIcon from "@mui/icons-material/Diamond";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import EggIcon from "@mui/icons-material/Egg";
import { sumArray, formatQubicAmount } from "./qubic/util";
import { formatDate } from "./qubic/util/commons";

const statusIcons = {
  active: {
    icon: CheckCircleIcon,
    label: "Active",
    color: "#4CAF50",
    darkColor: "#70CF97",
  },
  locked: {
    icon: LockIcon,
    label: "Locked",
    color: "#E53935",
    darkColor: "#FF6370",
  },
  published: {
    icon: EmojiEventsIcon,
    label: "Published",
    color: "#1565C0",
    darkColor: "#61f0fe",
  },
  waiting: {
    icon: HelpIcon,
    label: "Waiting",
    color: "#FFB300",
    darkColor: "#FFDE6B",
  },
  historical: {
    icon: EmojiEventsIcon,
    label: "Historical",
    color: "#9E9E9E",
    darkColor: "#B0BEC5",
  },
};

const getHotLevelIcon = (totalQus, slotsTaken) => {
  const darkModeColors = {
    diamond: "#61f0fe",
    fire: "#FF7043",
    hot: "#FF5722",
    warm: "#FFA726",
    neutral: "#9E9E9E",
  };

  if (totalQus >= 1_000_000_000 || slotsTaken >= 100) {
    return <DiamondIcon sx={{ color: darkModeColors.diamond, fontSize: "1.2rem" }} />;
  }
  if (totalQus >= 500_000_000 || slotsTaken >= 50) {
    return <LocalFireDepartmentIcon sx={{ color: darkModeColors.fire, fontSize: "1.2rem" }} />;
  }
  if (totalQus >= 100_000_000 || slotsTaken >= 10) {
    return <WhatshotIcon sx={{ color: darkModeColors.hot, fontSize: "1.2rem" }} />;
  }
  if (totalQus >= 10_000_000 || slotsTaken >= 5) {
    return <EggIcon sx={{ color: darkModeColors.warm, fontSize: "1.2rem" }} />;
  }
  return <EggIcon sx={{ color: darkModeColors.neutral, fontSize: "1.2rem" }} />;
};

function BetOverviewTable({ bets, onRowClick, loading }) {
  const theme = useTheme();

  const rows = useMemo(() => {
    return bets.map((bet) => {
      const slotsTaken = sumArray(bet.current_num_selection);
      const fee = `${sumArray(bet.oracle_fee)} %`;
      const burn = "2 %";
      const closingDate = `${formatDate(bet.close_date)} ${bet.close_time.slice(0, -3)}`;
      const sData = statusIcons[bet.status] || null;

      return {
        id: bet.bet_id,
        bet_id: bet.bet_id,
        status: sData,
        description: (bet.full_description || bet.bet_desc)?.slice(0, 64),
        closing: closingDate,
        slots: slotsTaken,
        fee: fee,
        burn: burn,
        total_qus: formatQubicAmount(bet.current_total_qus),
        popularity: getHotLevelIcon(bet.current_total_qus, slotsTaken),
      };
    });
  }, [bets]);

  const columns = [
    {
      field: "status",
      headerName: "Status",
      width: 120,
      sortable: true,
      renderHeader: () => (
        <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
          <Typography variant="subtitle2" fontWeight="bold">
            Status
          </Typography>
        </Box>
      ),
      renderCell: (params) => {
        const sData = params.value;
        if (!sData) return "—";
        const IconComponent = sData.icon;
        return (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            gap={0.5}
            height="100%"
          >
            <IconComponent
              fontSize="small"
              sx={{
                color: theme.palette.mode === "dark" ? sData.darkColor : sData.color,
              }}
            />
          </Box>
        );
      },
      headerAlign: "center",
      align: "center",
    },
    {
      field: "description",
      headerName: "Description",
      flex: 1,
      sortable: true,
      renderHeader: () => (
        <Box display="flex" alignItems="center" gap={0.5}>
          <Typography variant="subtitle2" fontWeight="bold">
            Description
          </Typography>
        </Box>
      ),
      renderCell: (params) => (
        <Box display="flex" alignItems="center" height="100%">
          <Typography variant="body2" noWrap>
            {params.value}
          </Typography>
        </Box>
      ),
      headerAlign: "left",
      align: "left",
    },
    {
      field: "closing",
      headerName: "Closing (UTC)",
      width: 180,
      sortable: true,
      renderHeader: () => (
        <Box display="flex" alignItems="center" gap={0.5}>
          <Typography variant="subtitle2" fontWeight="bold">
            Closing (UTC)
          </Typography>
        </Box>
      ),
      renderCell: (params) => (
        <Box display="flex" alignItems="center" justifyContent="center" height="100%">
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
      headerAlign: "center",
      align: "center",
    },
    {
      field: "slots",
      headerName: "Slots",
      width: 100,
      sortable: true,
      renderHeader: () => (
        <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
          <Typography variant="subtitle2" fontWeight="bold">
            Slots
          </Typography>
        </Box>
      ),
      renderCell: (params) => (
        <Box display="flex" alignItems="center" justifyContent="center" height="100%">
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
      headerAlign: "center",
      align: "center",
    },
    {
      field: "fee",
      headerName: "Fee",
      width: 100,
      sortable: true,
      renderHeader: () => (
        <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
          <Typography variant="subtitle2" fontWeight="bold">
            Fee (%)
          </Typography>
        </Box>
      ),
      renderCell: (params) => (
        <Box display="flex" alignItems="center" justifyContent="center" height="100%">
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
      headerAlign: "center",
      align: "center",
    },
    {
      field: "burn",
      headerName: "Burn (%)",
      width: 100,
      sortable: true,
      renderHeader: () => (
        <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
          <Typography variant="subtitle2" fontWeight="bold">
            Burn (%)
          </Typography>
        </Box>
      ),
      renderCell: (params) => (
        <Box display="flex" alignItems="center" justifyContent="center" height="100%">
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
      headerAlign: "center",
      align: "center",
    },
    {
      field: "total_qus",
      headerName: "Total Qubic",
      width: 160,
      sortable: true,
      renderHeader: () => (
        <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
          <Typography variant="subtitle2" fontWeight="bold">
            Total Qubic
          </Typography>
        </Box>
      ),
      renderCell: (params) => (
        <Box display="flex" alignItems="center" justifyContent="center" height="100%">
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
      headerAlign: "center",
      align: "center",
    },
    {
      field: "popularity",
      headerName: "Popularity",
      width: 150,
      sortable: false,
      renderHeader: () => (
        <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
          <Typography variant="subtitle2" fontWeight="bold">
            Popularity
          </Typography>
        </Box>
      ),
      renderCell: (params) => (
        <Box display="flex" alignItems="center" justifyContent="center" height="100%">
          {params.value}
        </Box>
      ),
      headerAlign: "center",
      align: "center",
    },
  ];

  return (
    <Fade in={true} timeout={600}>
      <Box
        sx={{
          width: "100%",
          background: theme.palette.background.paper,
          borderRadius: 1,
          "& .MuiDataGrid-row:hover": {
            backgroundColor: theme.palette.background.paper,
            cursor: "pointer",
          },
          "& .MuiDataGrid-cell": {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: theme.palette.background.default,
          },
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          disableRowSelectionOnClick
          autoHeight
          loading={loading}
          rowsPerPageOptions={[10, 25, 50, 100]}
          pageSize={10}
          onRowClick={(params) => onRowClick(params.row.bet_id)}
        />
      </Box>
    </Fade>
  );
}

export default memo(BetOverviewTable);
