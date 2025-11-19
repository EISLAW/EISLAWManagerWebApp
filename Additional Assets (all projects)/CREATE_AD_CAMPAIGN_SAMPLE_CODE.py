# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.

from facebook_business.adobjects.abstractobject import AbstractObject
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.campaign import Campaign
from facebook_business.api import FacebookAdsApi

access_token = "EAAJ1cHz2JfMBP5YCMsUuuONKZCmc5PzhKS3McEZAriwZBGDDzFaGlgjkhWxDuNqZCpgtWciDIR8ZBSPj5DvKOMRw2ZAwEy4nB0l3jg2C42q7ptLWXq4eI7e8bVqWdkj6KoTb6UqoWabe9qOkx5oyVUWgmlJmUK7IxclICGdSKNe2BJPfQdBAXtTDkZBuTq1TwwuA4KW"
app_id = "692075946714611"
ad_account_id = "act_801103545898702"
campaign_name = "My Quickstart Campaign"

params = {}
FacebookAdsApi.init(access_token=access_token)


# Create an ad campaign with objective OUTCOME_TRAFFIC

fields = []
params = {
    "name": campaign_name,
    "objective": "OUTCOME_TRAFFIC",
    "status": "PAUSED",
    "special_ad_categories": [],
}
campaign = AdAccount(ad_account_id).create_campaign(
    fields=fields,
    params=params,
)
campaign_id = campaign.get_id()

print("Your created campaign id is: " + campaign_id)
