/*
 *  Copyright 2022 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { Button, Typography } from 'antd';
import { AxiosError } from 'axios';
import { CookieStorage } from 'cookie-storage';
import { isEmpty } from 'lodash';
import { observer } from 'mobx-react';
import { Match } from 'Models';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useHistory, useLocation, useRouteMatch } from 'react-router-dom';
import appState from '../../AppState';
import { useAuthContext } from '../../authentication/auth-provider/AuthProvider';
import { getVersion } from '../../axiosAPIs/miscAPI';
import {
  getExplorePathWithSearch,
  getTeamAndUserDetailsPath,
  getUserPath,
  ROUTES,
  TERM_ADMIN,
  TERM_USER,
} from '../../constants/constants';
import {
  urlGitbookDocs,
  urlGithubRepo,
  urlJoinSlack,
} from '../../constants/URL.constants';
import { useAuth } from '../../hooks/authHooks';
import jsonData from '../../jsons/en';
import {
  addToRecentSearched,
  getEntityName,
  getNonDeletedTeams,
} from '../../utils/CommonUtils';
import SVGIcons, { Icons } from '../../utils/SvgUtils';
import { showErrorToast } from '../../utils/ToastUtils';
import { COOKIE_VERSION } from '../Modals/WhatsNewModal/whatsNewData';
import NavBar from '../nav-bar/NavBar';

const cookieStorage = new CookieStorage();

const Appbar: React.FC = (): JSX.Element => {
  const location = useLocation();
  const history = useHistory();
  const { t } = useTranslation();
  const { isFirstTimeUser } = useAuth(location.pathname);
  const {
    isAuthDisabled,
    isAuthenticated,
    isProtectedRoute,
    isTourRoute,
    onLogoutHandler,
  } = useAuthContext();
  const match: Match | null = useRouteMatch({
    path: ROUTES.EXPLORE_WITH_SEARCH,
  });
  const searchQuery = match?.params?.searchQuery;
  const [searchValue, setSearchValue] = useState(searchQuery);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState<boolean>(false);
  const [version, setVersion] = useState<string>('');

  const handleFeatureModal = (value: boolean) => {
    setIsFeatureModalOpen(value);
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    value ? setIsOpen(true) : setIsOpen(false);
  };

  const supportLinks = [
    {
      name: (
        <span>
          <span className="tw-text-grey-muted">{`${t('label.version')} ${
            (version ? version : '?').split('-')[0]
          }`}</span>
        </span>
      ),
      to: urlGithubRepo,
      isOpenNewTab: true,
      disabled: false,
      icon: (
        <SVGIcons
          alt="Version icon"
          className="tw-align-middle tw--mt-0.5 tw-mr-0.5"
          icon={Icons.VERSION_BLACK}
          width="12"
        />
      ),
    },
    {
      name: t('label.docs'),
      to: urlGitbookDocs,
      isOpenNewTab: true,
      disabled: false,
      icon: (
        <SVGIcons
          alt="Doc icon"
          className="tw-align-middle tw--mt-0.5 tw-mr-0.5"
          icon={Icons.DOC}
          width="12"
        />
      ),
    },
    {
      name: t('label.api-uppercase'),
      to: ROUTES.SWAGGER,
      disabled: false,
      icon: (
        <SVGIcons
          alt="API icon"
          className="tw-align-middle tw--mt-0.5 tw-mr-0.5"
          icon={Icons.API}
          width="12"
        />
      ),
    },
    {
      name: t('label.slack'),
      to: urlJoinSlack,
      disabled: false,
      isOpenNewTab: true,
      icon: (
        <SVGIcons
          alt="slack icon"
          className="tw-align-middle tw-mr-0.5"
          icon={Icons.SLACK_GREY}
          width="12"
        />
      ),
    },
    {
      name: (
        <Button
          className="focus:no-underline hover:underline flex-shrink p-0"
          data-testid="whatsnew-modal"
          type="text"
          onClick={() => handleFeatureModal(true)}>
          {t('label.whats-new')}
        </Button>
      ),
      disabled: false,
      icon: (
        <SVGIcons
          alt="Doc icon"
          className="align-middle tw-mr-0.5"
          icon={Icons.WHATS_NEW}
          width="12"
        />
      ),
    },
    {
      name: (
        <Button
          className="focus:no-underline hover:underline flex-shrink p-0"
          data-testid="tour"
          type="text"
          onClick={() => history.push(ROUTES.TOUR)}>
          {t('label.tour')}
        </Button>
      ),
      disabled: false,
      icon: (
        <SVGIcons
          alt="tour-con"
          className="align-middle tw-mr-0.5"
          icon={Icons.TOUR}
          width="12"
        />
      ),
    },
  ];

  const getUsersRoles = (userRoleArr: string[], name: string) => {
    return (
      <div>
        <div className="tw-text-grey-muted tw-text-xs">{name}</div>
        {userRoleArr.map((userRole, i) => (
          <Typography.Paragraph
            className="ant-typography-ellipsis-custom font-normal"
            ellipsis={{ tooltip: true }}
            key={i}>
            {userRole}
          </Typography.Paragraph>
        ))}
        <hr className="tw-my-1.5" />
      </div>
    );
  };

  const getUserName = () => {
    const currentUser = isAuthDisabled
      ? appState.nonSecureUserDetails
      : appState.userDetails;

    return currentUser?.displayName || currentUser?.name || TERM_USER;
  };

  const getUserData = () => {
    const currentUser = isAuthDisabled
      ? appState.nonSecureUserDetails
      : appState.userDetails;

    const name = currentUser?.displayName || currentUser?.name || TERM_USER;

    const roles = currentUser?.roles?.map((r) => getEntityName(r)) || [];
    const inheritedRoles =
      currentUser?.inheritedRoles?.map((r) => getEntityName(r)) || [];

    currentUser?.isAdmin && roles.unshift(TERM_ADMIN);

    const teams = getNonDeletedTeams(currentUser?.teams ?? []);

    return (
      <div className="tw-max-w-xs" data-testid="greeting-text">
        <Link
          data-testid="user-name"
          to={getUserPath(currentUser?.name as string)}>
          {' '}
          <Typography.Paragraph
            className="ant-typography-ellipsis-custom font-medium cursor-pointer text-primary"
            ellipsis={{ rows: 1, tooltip: true }}>
            {name}
          </Typography.Paragraph>
        </Link>
        <hr className="tw-my-1.5" />
        {roles.length > 0 ? getUsersRoles(roles, 'Roles') : null}
        {inheritedRoles.length > 0
          ? getUsersRoles(inheritedRoles, 'Inherited Roles')
          : null}
        {teams.length > 0 ? (
          <div>
            <span className="tw-text-grey-muted tw-text-xs">Teams</span>
            {teams.map((t, i) => (
              <Typography.Paragraph
                className="ant-typography-ellipsis-custom text-sm"
                ellipsis={{ tooltip: true }}
                key={i}>
                <Link to={getTeamAndUserDetailsPath(t.name as string)}>
                  {t.displayName || t.name}
                </Link>
              </Typography.Paragraph>
            ))}
            <hr className="tw-mt-1.5" />
          </div>
        ) : null}
      </div>
    );
  };

  const profileDropdown = [
    {
      name: getUserData(),
      to: '',
      disabled: false,
      icon: <></>,
      isText: true,
    },
    {
      name: t('label.logout'),
      to: '',
      disabled: false,
      method: onLogoutHandler,
    },
  ];

  const searchHandler = (value: string) => {
    setIsOpen(false);
    addToRecentSearched(value);
    history.push({
      pathname: getExplorePathWithSearch(
        encodeURIComponent(value),
        // this is for if user is searching from another page
        location.pathname.startsWith(ROUTES.EXPLORE)
          ? appState.explorePageTab
          : 'tables'
      ),
      search: location.search,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    if (e.key === 'Enter') {
      searchHandler(target.value);
    }
  };

  const handleOnclick = () => {
    searchHandler(searchValue ?? '');
  };

  const fetchOMVersion = () => {
    getVersion()
      .then((res) => {
        setVersion(res.version);
      })
      .catch((err: AxiosError) => {
        showErrorToast(
          err,
          jsonData['api-error-messages']['fetch-version-error']
        );
      });
  };

  useEffect(() => {
    setSearchValue(decodeURIComponent(searchQuery || ''));
  }, [searchQuery]);

  useEffect(() => {
    setIsFeatureModalOpen(
      // TODO: Add !isFirstTimeUser to condition if showing Welcome Modal
      cookieStorage.getItem(COOKIE_VERSION) !== 'true'
    );
  }, [isFirstTimeUser]);

  useEffect(() => {
    if (isAuthDisabled) {
      fetchOMVersion();
    } else {
      if (!isEmpty(appState.userDetails)) {
        fetchOMVersion();
      }
    }
  }, [appState.userDetails, isAuthDisabled]);

  return (
    <>
      {isProtectedRoute(location.pathname) &&
      (isAuthDisabled || isAuthenticated) &&
      !isTourRoute(location.pathname) ? (
        <NavBar
          handleFeatureModal={handleFeatureModal}
          handleKeyDown={handleKeyDown}
          handleOnClick={handleOnclick}
          handleSearchBoxOpen={setIsOpen}
          handleSearchChange={handleSearchChange}
          isFeatureModalOpen={isFeatureModalOpen}
          isSearchBoxOpen={isOpen}
          pathname={location.pathname}
          profileDropdown={profileDropdown}
          searchValue={searchValue || ''}
          supportDropdown={supportLinks}
          username={getUserName()}
        />
      ) : null}
    </>
  );
};

export default observer(Appbar);
