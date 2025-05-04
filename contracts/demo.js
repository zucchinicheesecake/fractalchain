module.exports = function (state, input) {
  if (!state.counter) state.counter = 0;
  if (input && input.inc) state.counter += input.inc;
  return state;
};

module.exports = function (s, i) {
  if (!s.counter) s.counter = 0;
  if (i && i.inc) s.counter += i.inc;
  return s;
};
