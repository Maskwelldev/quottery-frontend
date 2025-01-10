import React, { useState, useCallback } from "react";
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Grid,
  useTheme,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import { motion } from "framer-motion";

/** ModernDropdown
 *  Reusable dropdown component 
 */
const ModernDropdown = ({ options, selected, onSelect, icon }) => {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    (index) => {
      onSelect(index);
      setIsOpen(false);
    },
    [onSelect]
  );

  return (
    <Box sx={{ position: "relative", width: "100%" }}>
      <Box
        component={motion.div}
        onClick={handleToggle}
        sx={{
          display: "flex",
          alignItems: "center",
          height: 56,
          p: 1.5,
          borderRadius: 3,
          cursor: "pointer",
          border: `2px solid ${
            isOpen ? theme.palette.primary.main : theme.palette.divider
          }`,
          transition: "background-color 0.2s ease, border-color 0.2s ease",
        }}
      >
        {icon &&
          React.cloneElement(icon, {
            sx: {
              mr: 1.5,
              color: isOpen
                ? theme.palette.primary.main
                : theme.palette.text.secondary,
            },
          })}
        <Typography
          variant="body1"
          sx={{
            flexGrow: 1,
            color: isOpen
              ? theme.palette.primary.main
              : theme.palette.text.primary,
            fontWeight: "bold",
          }}
        >
          {options[selected]?.label}
        </Typography>
      </Box>

      {isOpen && (
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          sx={{
            position: "absolute",
            top: "110%",
            left: 0,
            right: 0,
            zIndex: 10,
            borderRadius: 3,
            boxShadow: theme.shadows[8],
            overflow: "hidden",
            sx: {
                borderRadius: 3,
              },
          }}
        >
          {options.map((option, index) => {
            const isSelected = selected === index;

            return (
              <Box
                key={option.value}
                onClick={() => handleSelect(index)}
                sx={{
                  p: 2,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: isSelected
                    ? theme.palette.background.default
                    : theme.palette.background.default,
                  "&:hover": {
                    backgroundColor: theme.palette.background.paper,
                  },
                  transition: "all 0.2s ease",
                }}
              >
                <Typography
                  variant="body1"
                  color={theme.palette.text.primary}
                >
                  {option.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

/** SearchFilter
 *  Composant combinant une barre de recherche et un dropdown de filtre.
 */
const SearchFilter = ({
  searchTerm,
  onSearchChange,
  filterOptions,
  currentFilterOption,
  onFilterChange,
}) => {
  const theme = useTheme();

  const handleClearSearch = useCallback(() => {
    onSearchChange("");
  }, [onSearchChange]);

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      sx={{ width: "100%" }}
    >
      <Grid container spacing={3} alignItems="center">
        <Grid item xs={12} md={9}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search bets..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ mr: 1 }} />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <Tooltip title="Clear search">
                    <IconButton
                      size="small"
                      onClick={handleClearSearch}
                      sx={{
                        color: theme.palette.text.secondary,
                        "&:hover": {
                          color: theme.palette.error.main,
                        },
                      }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
              sx: {
                borderRadius: 3,
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor:
                    theme.palette.mode === "dark"
                      ? theme.palette.divider
                      : theme.palette.divider,
                  borderWidth: 2,
                },
              },
            }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <ModernDropdown
            options={filterOptions}
            selected={currentFilterOption}
            onSelect={onFilterChange}
            icon={<FilterListIcon />}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default SearchFilter;
