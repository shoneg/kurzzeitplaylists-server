type MockRes = {
  status: jest.Mock;
  send: jest.Mock;
  redirect: jest.Mock;
  render: jest.Mock;
};

export const createRes = (): MockRes => {
  const res: Partial<MockRes> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.render = jest.fn().mockReturnValue(res);
  return res as MockRes;
};

export const createNext = () => jest.fn();
